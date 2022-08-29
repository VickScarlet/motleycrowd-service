/** @readonly 错误码 */
const ErrorCode = {
    /** @readonly 通常错误 */
    COMMON_ERR: 1,
    /** @readonly 没有命令 */
    NO_CMD: 1001,

    /** @readonly 没有认证 */
    NO_AUTH: 2000,
    /** @readonly 没有用户 */
    NO_USER: 2001,
    /** @readonly 密码错误 */
    PASSWORD_ERROR: 2002,

    /** @readonly 没有游戏类型 */
    NO_GAME_TYPE: 3000,
    /** @readonly 已经在游戏中了 */
    GAME_IN_ROOM: 3001,
};

export default ErrorCode;