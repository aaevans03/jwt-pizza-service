const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database');
const { expectValidJwt } = require('./testHelper');
const { createAdminUser, createTestUser } = require('./factories');

let adminUser;
let adminUserAuthToken;

beforeAll(async () => {
    DB.setTesting();

    // create an admin user to use for all of these tests
    const adminUserResponse = await createAdminUser();

    adminUser = {
        name: adminUserResponse.name,
        email: adminUserResponse.email,
        password: adminUserResponse.password,
        id: adminUserResponse.id
    };
    
    const loginRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
    adminUserAuthToken = loginRes.body.token;
    expectValidJwt(adminUserAuthToken);
});

afterAll(async() => {
    await DB.deleteTestingDatabase();
});

test('Get info for authenticated user', async () => {
    const response = await request(app).get('/api/user/me').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(adminUser.id);
    expect(response.body.name).toBe(adminUser.name);
    expect(response.body.email).toBe(adminUser.email);
    expect(response.body.roles).toEqual([{ role: 'admin' }]);
});

test('Admin update info of self', async () => {
    const updatedName = 'Updated Admin Name';
    const updatedEmail = 'updatedemail@jwt.com';
    const updatedPassword = 'newpassword123';

    const response = await request(app)
        .put(`/api/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send({ name: updatedName, email: updatedEmail, password: updatedPassword });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(adminUser.id);
    expect(response.body.user.name).toBe(updatedName);
    expect(response.body.user.email).toBe(updatedEmail);
    expect(response.body.user.roles).toEqual([{ role: 'admin' }]);
    expectValidJwt(response.body.token);

    // Update adminUser for future tests
    adminUser.name = updatedName;
    adminUser.email = updatedEmail;
    adminUser.password = updatedPassword;
    adminUserAuthToken = response.body.token;
});

test('List users unauthorized', async () => {
    const response = await request(app).get('/api/user');
    expect(response.status).toBe(401);
});

test('List users', async () => {
    const adminUserResponse = await createAdminUser();
    const userResponse = await createTestUser();

    const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.users).toBeDefined();
    expect(response.body.users.length).toBeGreaterThan(0);

    // Check format of response
    expect(response.body.users).toEqual(expect.arrayContaining([
        expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            email: expect.any(String),
            roles: expect.any(Array),
        })],
        expect.any(Boolean),
    ));

    // Expect the users we just created to be in response
    expect(response.body.users).toEqual(expect.arrayContaining([
        expect.objectContaining({
            id: adminUserResponse.id,
            name: adminUserResponse.name,
            email: adminUserResponse.email,
            roles: [{ role: 'admin' }],
        })
    ]));
    expect(response.body.users).toEqual(expect.arrayContaining([
        expect.objectContaining({
            id: userResponse.id,
            name: userResponse.name,
            email: userResponse.email,
            roles: [{ role: 'diner' }],
        })
    ]));
});

test('List users with pagination', async () => {
    for (let i = 0; i < 25; i++) {
        await createTestUser();
    }

    const response = await request(app)
        .get('/api/user?page=0&limit=10')
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(10);
    expect(response.body.more).toBe(true);
    expect(response.body.users[0].id).toBe(1);
    
    // The initial admin user should be in the result
    expect(response.body.users).toEqual(expect.arrayContaining([
        expect.objectContaining({
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            roles: [{ role: 'admin' }],
        })
    ]));
});

test('List users on second page', async () => {
    for (let i = 0; i < 10; i++) {
        await createTestUser();
    }

    const response = await request(app)
        .get('/api/user?page=1&limit=10')
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(10);
    expect(response.body.more).toBe(true);
    expect(response.body.users[0].id).toBe(11);
    expect(response.body.users[9].id).toBe(20);

    // The initial admin user should not be in the result
    expect(response.body.users).not.toEqual(expect.arrayContaining([
        expect.objectContaining({
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            roles: [{ role: 'admin' }],
        })
    ]));
});

test('List 25 users', async () => {
    for (let i = 0; i < 25; i++) {
        await createTestUser();
    }

    const response = await request(app)
        .get('/api/user?page=0&limit=25')
        .set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(25);
    expect(response.body.more).toBe(true);
    expect(response.body.users[0].id).toBe(1);
    expect(response.body.users[24].id).toBe(25);
});

test('List users with name filter', async () => {
    const username = "Pizza Lover 12345";
    const user1 = await createTestUser({ name: username });
    const user2 = await createAdminUser({ name: username });

    const response = await request(app)
        .get(`/api/user?name=${user1.name}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(2);
    expect(response.body.more).toBe(false);

    expect(response.body.users[0].id).toBe(user1.id);
    expect(response.body.users[0].name).toBe(user1.name);
    expect(response.body.users[0].email).toBe(user1.email);
    expect(response.body.users[0].roles).toEqual(expect.arrayContaining([{ role: 'diner' }]));

    expect(response.body.users[1].id).toBe(user2.id);
    expect(response.body.users[1].name).toBe(user2.name);
    expect(response.body.users[1].email).toBe(user2.email);
    expect(response.body.users[1].roles).toEqual(expect.arrayContaining([{ role: 'admin' }]));
});

test('List users with name filter of nonexistent user', async () => {
    const response = await request(app)
        .get("/api/user?name=nonexistentUser")
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(0);
    expect(response.body.more).toBe(false);
});

test('Delete a user', async () => {
    const userToDelete = await createTestUser();

    const deleteResponse = await request(app)
        .delete(`/api/user/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(deleteResponse.body.message).toBe('user deleted');
    expect(deleteResponse.status).toBe(200);

    // See if user is in list of users
    const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.users).toBeDefined();

    const deletedUser = response.body.users.find(u => u.id === userToDelete.id);
    expect(deletedUser).toBeUndefined();
});

test('Delete nonexistent user', async () => {
    const userIdToDelete = 999999;

    const response = await request(app)
        .delete(`/api/user/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    
    expect(response.status).toBe(500);
    expect(response.body.message).toBe('unknown user');
});
