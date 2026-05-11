import React from 'react';
import { STORE_ITEMS } from '../constants';
import { Coins, ShoppingCart } from './Icons';
import { audio } from '../utils/audio';

export function StoreModal({ userCoins, inventory, onBuy, onEquip, onClose, t }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <ShoppingCart size={24} />
                        <h2 className="text-xl font-bold">{t('store')}</h2>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full font-bold">
                        <Coins size={16} className="text-yellow-200" />
                        <span>{Math.floor(userCoins)}</span>
                    </div>
                    <div className="absolute inset-0 bg-white/10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] bg-repeat opacity-50 mix-blend-overlay"></div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50 flex flex-col gap-3">
                    {STORE_ITEMS.map(item => {
                        let isOwned = false;
                        let isEquipped = false;
                        
                        if (item.type === 'buff' && item.id === 'xpBuff' && inventory?.xpBuff) isOwned = true;
                        if (item.type === 'auto' && item.id === 'autoWater' && inventory?.autoWater) isOwned = true;
                        if (item.type === 'skin') {
                            if (inventory?.unlockedSkins?.includes(item.id)) isOwned = true;
                            if (inventory?.treeSkin === item.id) isEquipped = true;
                        }

                        const canAfford = userCoins >= item.price;

                        return (
                            <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-amber-100 flex-shrink-0">
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{t(item.nameKey)}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2">{t(item.descKey)}</p>
                                    <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-500">
                                        {!isOwned && (
                                            <>
                                                <Coins size={12} />
                                                <span>{item.price}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    {isEquipped ? (
                                        <button disabled className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold w-full whitespace-nowrap">
                                            {t('equipped')}
                                        </button>
                                    ) : isOwned && item.type === 'skin' ? (
                                        <button onClick={() => { audio.playClick(); onEquip(item.id); }} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold w-full shadow-sm transition-colors whitespace-nowrap">
                                            {t('equip')}
                                        </button>
                                    ) : isOwned ? (
                                        <button disabled className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold w-full whitespace-nowrap">
                                            {t('owned')}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                if (canAfford) {
                                                    audio.playClick();
                                                    onBuy(item.id, item.price, item.type);
                                                } else {
                                                    audio.playClick(); 
                                                }
                                            }} 
                                            disabled={!canAfford}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold w-full shadow-sm transition-colors whitespace-nowrap ${canAfford ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            {t('buy')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                    <button onClick={() => { audio.playClick(); onClose(); }} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                        {t('back')}
                    </button>
                </div>
            </div>
        </div>
    );
}