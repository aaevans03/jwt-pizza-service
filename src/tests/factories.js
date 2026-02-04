const { DB } = require('../database/database');
const { Role } = require('../model/model.js');
const { randomName } = require('./testHelper');


async function createTestUser(overrides = {}) {
    const defaults = {
        name: randomName(),
        email: randomName() + '@test.com',
        password: 'testpassword',
        roles: [{ role: Role.Diner }],
    }
    let user = { ...defaults, ...overrides };

    user = await DB.addUser(user);
    return { ...user, ...overrides };
};

async function createAdminUser(overrides = {}) {
    return createTestUser({
        roles: [{ role: Role.Admin }],
        ...overrides,
    });
}

module.exports = { createTestUser, createAdminUser };