export const SAVE_KEY='neon-rain-v1';
export function validateSave(value){if(!value||value.version!==1||!Number.isInteger(value.level)||value.level<0||value.level>2||!Number.isInteger(value.unlocked)||value.unlocked<value.level||value.unlocked>2||!Number.isFinite(value.score)||value.score<0||value.score>1e8)throw Error('无效存档');return {version:1,level:value.level,unlocked:value.unlocked,score:Math.floor(value.score)};}
export function encodeSave(value){return btoa(JSON.stringify(validateSave(value)));}
export function decodeSave(code){return validateSave(JSON.parse(atob(code)));}
