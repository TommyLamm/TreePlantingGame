function drainServer({ server, drainTimeoutMs, setTimer, clearTimer }) {
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
            let forceError;
            try {
                server.closeIdleConnections?.();
                server.closeAllConnections?.();
            } catch (error) {
                forceError = error;
            }
            finish(forceError);
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
    setTimer = setTimeout,
    clearTimer = clearTimeout,
}) {
    let shutdownPromise;

    return function shutdown(signal, desiredExitCode = 0) {
        if (!shutdownPromise) {
            logger.log(`\n[Shutdown] Received ${signal}. Saving data to disk...`);
            repository.stopAutoSave();
            shutdownPromise = (async () => {
                let finalExitCode = desiredExitCode;
                const closeError = await drainServer({
                    server,
                    drainTimeoutMs,
                    setTimer,
                    clearTimer,
                });
                if (closeError && closeError.code !== 'ERR_SERVER_NOT_RUNNING') {
                    logger.error('[Shutdown Error] Failed to close server:', closeError);
                    finalExitCode = 1;
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
                    finalExitCode = 1;
                }

                if (saved) {
                    logger.log(hadPending
                        ? '[Shutdown] Data saved successfully.'
                        : '[Shutdown] No pending changes. Data is safe.');
                }
                exit(finalExitCode);
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
        if (error.code === 'EADDRINUSE') {
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
