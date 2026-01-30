const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database');
const { expectValidJwt, randomName } = require('./testHelper');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

beforeAll(async () => {
    DB.setTesting();
    createAdminUser();

    testUser.email = randomName() + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
});

afterAll(async() => {
    await DB.deleteTestingDatabase();
})

test('Get Franchises', async () => {

});