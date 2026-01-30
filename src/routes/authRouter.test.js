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
});

test('Register Fail', async () => {
    const registerRes = await request(app).post('/api/auth').send([{ dummyData: "yes" }]);

    expect(registerRes.status).toBe(400);
    expect(registerRes.body.message).toBe('name, email, and password are required');

});

test('Login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expectValidJwt(loginRes.body.token);

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
    delete expectedUser.password;
    expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('Logout', async () => {
    const logoutRes = await (await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`));
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('logout successful');
})

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}


/*
describe('authRouter unit tests', () => {
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  const { DB } = require('../database/database');
  const { setAuthUser, setAuth, authRouter } = require('./authRouter');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('setAuth generates a token and calls DB.loginUser', async () => {
    const user = { id: 999, name: 'unit', email: 'u@test', roles: [{ role: 'diner' }] };
    const loginSpy = jest.spyOn(DB, 'loginUser').mockImplementation(() => Promise.resolve());

    const token = await setAuth(user);

    expect(token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
    expect(loginSpy).toHaveBeenCalledWith(user.id, token);
  });

  test('setAuthUser sets req.user when token present and DB.isLoggedIn true', async () => {
    const user = { id: 42, name: 'tester', email: 't@test', roles: [{ role: 'diner' }] };
    const token = jwt.sign(user, config.jwtSecret);

    jest.spyOn(DB, 'isLoggedIn').mockImplementation(() => Promise.resolve(true));

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    await setAuthUser(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(user.id);
    expect(typeof req.user.isRole).toBe('function');
    expect(req.user.isRole('diner')).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  test('setAuthUser does not set req.user when DB.isLoggedIn false', async () => {
    const user = { id: 43, name: 'tester2', email: 't2@test', roles: [{ role: 'diner' }] };
    const token = jwt.sign(user, config.jwtSecret);

    jest.spyOn(DB, 'isLoggedIn').mockImplementation(() => Promise.resolve(false));

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    await setAuthUser(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test('authenticateToken responds 401 when no req.user', () => {
    const req = {};
    const send = jest.fn();
    const status = jest.fn(() => ({ send }));
    const res = { status };
    const next = jest.fn();

    authRouter.authenticateToken(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ message: 'unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});
*/
