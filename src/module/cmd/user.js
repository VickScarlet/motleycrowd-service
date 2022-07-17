const commands = new Map();
export default commands;

commands.set('register', (uuid, {username, password}) => {
    return $core.user.register(uuid, username, password);
});

commands.set('authenticate', (uuid, {username, password}) => {
    return $core.user.authenticate(uuid, username, password);
});

commands.set('guest', (uuid) => {
    return $core.user.guest(uuid);
});

commands.set('logout', (uuid) => {
    return $core.user.logout(uuid);
});