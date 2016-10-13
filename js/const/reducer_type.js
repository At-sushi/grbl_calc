// vim: sts=2 sw=2 ts=2 expandtab
// 主にreducerで使ったり渡したりする定数集

export const state = {
  FETCHING: "DATA_FETCHING",
  LOADING: "DATA_LOADING",
  LOADED: "DATA_LOADED",
  SAVING: "DATA_SAVING",
  SAVED: "DATA_SAVED",
  COMPUTING: "DATA_COMPUTING",
  ERROR: "DATA_ERROR"
};

export const inputlock = {
  INCREMENT: "INPUTLOCK_INCREMENT",
  DECREMENT: "INPUTLOCK_DECREMENT"
};

export const data_type = {
  JOB: "TYPE_JOB",
  SAVELOAD: "TYPE_SAVELOAD"
};

export const job = {
  ASSIGN: "JOB_ASSIGN",
  DELETE: "JOB_DELETE"
};

export const weapon = {
  APPEND: "WEAPON_APPEND",
  DELETE: "WEAPON_DELETE",
  DANGER_REPLACE: "WEAPON_REPLACE",
  MOVE: "WEAPON_MOVE",
  SORT: "WEAPON_SORT",
  ENABLE: "WEAPON_ENABLE",
  DISABLE: "WEAPON_DISABLE",
  COSMOS: "WEAPON_SET_COSMOS_STATUS",
  LOCK: "WEAPON_SET_LOCK_STATUS",
  NAME: "WEAPON_SET_NAME",
  ATK: "WEAPON_SET_ATK",
  TYPE: "WEAPON_SET_TYPE",
  SLOT: "WEAPON_SET_SLOT",
  SKILL: "WEAPON_SET_SKILL",
  LV: "WEAPON_SET_LV"
};

export const summon = {
  APPEND: "SUMMON_APPEND",
  DELETE: "SUMMON_DELETE",
  DANGER_REPLACE: "SUMMON_REPLACE",
  MOVE: "SUMMON_MOVE",
  SORT: "SUMMON_SORT",
  ENABLE: "SUMMON_ENABLE",
  DISABLE: "SUMMON_DISABLE",
  LOCK: "SUMMON_SET_LOCK_STATUS",
  NAME: "SUMMON_SET_NAME",
  ATK: "SUMMON_SET_ATK",
  SKILL: "SUMMON_SET_SKILL"
};

export const friend = {
  APPEND: "FRIEND_APPEND",
  DELETE: "FRIEND_DELETE",
  DANGER_REPLACE: "FRIEND_REPLACE",
  MOVE: "FRIEND_MOVE",
  SORT: "FRIEND_SORT",
  ENABLE: "FRIEND_ENABLE",
  DISABLE: "FRIEND_DISABLE",
  LOCK: "FRIEND_SET_LOCK_STATUS",
  NAME: "FRIEND_SET_NAME",
  ATK: "FRIEND_SET_ATK",
  SKILL: "FRIEND_SET_SKILL"
};

export const basic = {
  ATK_PERCENT: "BASIC_SET_ATK_PERCENT",
  ATK_VALUE: "BASIC_SET_ATK_VALUE",
  ZENITH_ATK: "BASIC_SET_ZENITH_ATKVAL",
  ZENITH_WEAPON: "BASIC_SET_ZENITH_WEAPON",
  ZENITH_ATTR: "BASIC_SET_ZENITH_ATTR",
  RANK: "BASIC_SET_RANK",
  SHIP_BONUS: "BASIC_SET_SHIP_BONUS",
  HP_PERCENT: "BASIC_SET_HP_PERCENT",
  AFFINITY: "BASIC_SET_AFFINITY",
  JOB: "BASIC_SET_JOB",
  DANGER_REPLACE: "BASIC_REPLACE"
};
