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

async function createFranchise(adminEmail, overrides = {}) {
    const defaults = {
        name: randomName() + ' Pizza',
        admins: [{ email: adminEmail }],
    };
    let franchiseData = { ...defaults, ...overrides };

    franchiseData = await DB.createFranchise(franchiseData);
    return { ...franchiseData, ...overrides };
}

async function createStore(franchiseId, overrides = {}) {
    const defaults = {
        name: randomName() + ' Pizza Store',
    };
    let storeData = { ...defaults, ...overrides };

    storeData = await DB.createStore(franchiseId, storeData);
    return { ...storeData, ...overrides };
}

module.exports = { createTestUser, createAdminUser, createFranchise, createStore };
