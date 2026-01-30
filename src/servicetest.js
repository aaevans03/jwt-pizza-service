const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

// this ain't bad! But maybe we can use a utility method?
// another idea: create a database to use just for testing, then tear it down afterwards?
beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';     // random email
  const registerRes = await request(app).post('/api/auth').send(testUser);        // register
  testUserAuthToken = registerRes.body.token;                                     // get the auth token
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const user = { ...testUser, roles: [{ role: 'diner' }] };      // destructuring
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
  expect(loginRes.body.authToken).not.toBe(testUserAuthToken);
});
