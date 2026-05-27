export const MAX_LEVEL = 100;

export const STORE_ITEMS = [
    { id: 'xpBuff', type: 'buff', price: 500, icon: '🌟', nameKey: 'itemXpBuff', descKey: 'descXpBuff' },
    { id: 'autoWater', type: 'auto', price: 1000, icon: '🤖', nameKey: 'itemAutoWater', descKey: 'descAutoWater' },
    { id: 'cherry', type: 'skin', price: 2000, icon: '🌸', nameKey: 'itemCherrySkin', descKey: 'descCherrySkin' },
    { id: 'autumn', type: 'skin', price: 2500, icon: '🍂', nameKey: 'itemAutumnSkin', descKey: 'descAutumnSkin' },
    { id: 'snow', type: 'skin', price: 3000, icon: '❄️', nameKey: 'itemSnowSkin', descKey: 'descSnowSkin' },
    { id: 'golden', type: 'skin', price: 5000, icon: '✨', nameKey: 'itemGoldenSkin', descKey: 'descGoldenSkin' },
];

export const MILESTONES = [
    { level: 1, stage: 1, nameKey: 'stageSeed' },
    { level: 5, stage: 2, nameKey: 'stageSprout' },
    { level: 12, stage: 3, nameKey: 'stageSapling' },
    { level: 26, stage: 4, nameKey: 'stageYoung' },
    { level: 46, stage: 5, nameKey: 'stageMature' },
    { level: 66, stage: 6, nameKey: 'stageGrand' },
    { level: 86, stage: 7, nameKey: 'stageAncient' },
];

export const ACHIEVEMENT_DEFS = [
    { id: 'first_event', nameKey: 'achFirstEvent', icon: '🌱' },
    { id: 'lvl10', nameKey: 'achLvl10', icon: '🌿' },
    { id: 'lvl25', nameKey: 'achLvl25', icon: '🌳' },
    { id: 'lvl50', nameKey: 'achLvl50', icon: '🏔️' },
    { id: 'lvl100', nameKey: 'achLvl100', icon: '⭐' },
    { id: 'rich', nameKey: 'achRich', icon: '💰' },
    { id: 'interact50', nameKey: 'achInteract50', icon: '🤝' },
    { id: 'interact100', nameKey: 'achInteract100', icon: '🧙' },
];
