const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('Register', async () => {
    const registerRes = await request(app).post('/api/auth').send(testUser);

    expect(registerRes.status).toBe(200);
    expectValidJwt(registerRes.body.token);

    const expectedUser = { name: 'pizza diner', email: testUser.email, roles: [{ role: 'diner' }] };
    expect(registerRes.body.user).toMatchObject(expectedUser);

    console.log(registerRes.body);
});

test('Login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

