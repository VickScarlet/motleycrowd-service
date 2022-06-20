const commands = new Map();
export default commands;

commands.set('create', (uuid, configure) => {
    return $core.game.create(uuid, configure);
});

commands.set('join', (uuid, {room}) => {
    return $core.game.join(uuid, room);
});

commands.set('random', (uuid) => {
    return $core.game.random(uuid);
});

commands.set('leave', (uuid) => {
    return $core.game.leave(uuid);
});

commands.set('answer', (uuid, {answer, question}) => {
    return $core.game.answer(uuid, answer, question);
});