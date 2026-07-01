function drainServer({ server, drainTimeoutMs, forceTimeoutMs, setTimer, clearTimer }) {
    return new Promise((resolve) => {
        let settled = false;
        let timer;

        const finish = (error) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimer(timer);
            resolve(error);
        };

        timer = setTimer(() => {
            timer = setTimer(() => {
                finish(new Error('Timed out waiting for server to close after forcing connections.'));
            }, forceTimeoutMs);
            let forceError;
            try {
                server.closeIdleConnections?.();
            } catch (error) {
                forceError = error;
            }
            try {
                server.closeAllConnections?.();
            } catch (error) {
                forceError ||= error;
            }
            if (forceError) finish(forceError);
        }, drainTimeoutMs);

        try {
            server.close(finish);
        } catch (error) {
            finish(error);
        }
    });
}

function createShutdown({
    repository,
    server,
    exit = process.exit,
    logger = console,
    drainTimeoutMs = 10_000,
    forceTimeoutMs = 2_000,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
}) {
    let shutdownPromise;
    let requestedExitCode = 0;

    return function shutdown(signal, desiredExitCode = 0) {
        requestedExitCode = Math.max(requestedExitCode, desiredExitCode);
        if (!shutdownPromise) {
            logger.log(`\n[Shutdown] Received ${signal}. Saving data to disk...`);
            repository.stopAutoSave();
            shutdownPromise = (async () => {
                let internalFailure = false;
                const closeError = await drainServer({
                    server,
                    drainTimeoutMs,
                    forceTimeoutMs,
                    setTimer,
                    clearTimer,
                });
                if (closeError && closeError.code !== 'ERR_SERVER_NOT_RUNNING') {
                    logger.error('[Shutdown Error] Failed to close server:', closeError);
                    internalFailure = true;
                }

                const hadPending = repository.isDirty();
                let saved = false;
                try {
                    await repository.flush();
                    if (repository.isDirty()) {
                        throw new Error('Data remains unsaved after flush.');
                    }
                    saved = true;
                } catch (error) {
                    logger.error('[Shutdown Error] Failed to save data:', error);
                    internalFailure = true;
                }

                if (saved) {
                    logger.log(hadPending
                        ? '[Shutdown] Data saved successfully.'
                        : '[Shutdown] No pending changes. Data is safe.');
                }
                exit(Math.max(requestedExitCode, internalFailure ? 1 : 0));
            })();
        }
        return shutdownPromise;
    };
}

function attachServerLifecycle({
    server,
    repository,
    shutdown,
    port,
    logger = console,
    exit = process.exit,
}) {
    let listeningSucceeded = false;

    server.on('listening', () => {
        listeningSucceeded = true;
        repository.startAutoSave();
        logger.log(`\n🌱 Zen Arboretum Server running on http://localhost:${port}`);
    });

    server.on('error', (error) => {
        if (!listeningSucceeded && error.code === 'EADDRINUSE') {
            repository.stopAutoSave();
            logger.error(`\n[Server] Port ${port} is already in use.`);
            logger.error('[Server] Another game server is probably still running.');
            logger.error(`[Server] Stop the existing process or start this one with a different port, for example: $env:PORT=7778; node server.js\n`);
            exit(1);
            return;
        }
        logger.error('[Server Error]', error);
        if (listeningSucceeded) {
            void shutdown('SERVER_ERROR', 1);
        } else {
            repository.stopAutoSave();
            exit(1);
        }
    });
}

module.exports = { attachServerLifecycle, createShutdown };
