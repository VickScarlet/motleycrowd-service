const commands = new Map();
export default commands;

commands.set('create', (uuid, configure) => {
    return $core.game.create(uuid, configure);
});

commands.set('join', (uuid, {room}) => {
    return $core.game.join(uuid, room);
});

commands.set('pair', (uuid, {type}) => {
    return $core.game.pair(uuid, type);
});

commands.set('leave', (uuid) => {
    return $core.game.leave(uuid);
});

commands.set('answer', (uuid, {answer, question}) => {
    return $core.game.answer(uuid, answer, question);
});