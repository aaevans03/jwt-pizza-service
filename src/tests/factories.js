const { DB } = require('../database/database');
const { randomName } = require('./testHelper');


async function createTestUser(overrides = {}) {
    const defaults = {
        name: randomName(),
        email: randomName() + '@test.com',
        password: 'testpassword',
        roles: [{ role: 'diner' }],
    }
    let user = { ...defaults, ...overrides };

    user = await DB.addUser(user);
    return { ...user, ...overrides };
};

module.exports = { createTestUser };