const tenantId = '42';

const tenant = {
  id: Number(tenantId),
  shop_name: 'Cycle A User Store',
  owner_name: 'Runtime Owner',
  email: 'runtime@example.com',
  mobile: '9999999999',
  plan_type: 'pro',
  status: 'Active',
  shop_details: { city: 'Hyderabad', state: 'Telangana' },
  plan_features: { max_users: 10 },
  subscription: { plan: 'pro' },
  addons: {}
};

const retainedUser = {
  id: 82,
  name: 'Cycle A Manager',
  email: 'manager@example.com',
  role: 'manager',
  all_branch_access: true,
  created_at: '2026-09-02T00:00:00Z'
};

const inputByLabel = (label) =>
  cy.contains('.MuiDialog-root label', new RegExp(`^${label}$`, 'i'))
    .invoke('attr', 'for')
    .then((fieldId) => {
      if (!fieldId) throw new Error(`No dialog input id found for label "${label}"`);
      return cy.get(`.MuiDialog-root [id="${fieldId}"]`);
    });

const fillByLabel = (label, value) => {
  inputByLabel(label).clear().type(String(value));
};

describe('Admin runtime - tenant user create failure containment', () => {
  it('preserves existing users and entered correction context when registration is rejected', () => {
    let userReads = 0;
    let createWrites = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, {
      statusCode: 200,
      body: { data: { tenant } }
    }).as('tenant');
    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-create-failure-token');
      req.reply({ statusCode: 200, body: { users: [retainedUser] } });
    }).as('users');
    cy.intercept('GET', `**/tenants/${tenantId}/branches`, {
      statusCode: 200,
      body: { branches: [] }
    }).as('branches');
    cy.intercept('POST', `**/tenants/${tenantId}/users`, (req) => {
      createWrites += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-create-failure-token');
      expect(req.body).to.deep.equal({
        name: 'Cycle A Duplicate Cashier',
        email: 'manager@example.com',
        password: 'Runtime@123',
        role: 'admin',
        all_branch_access: true
      });
      req.reply({
        statusCode: 409,
        body: { message: 'User already registered for tenant' }
      });
    }).as('createUser');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-user-create-failure-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait(['@tenant', '@users', '@branches']);
    cy.contains('tr', 'Cycle A Manager')
      .should('contain.text', 'manager@example.com')
      .and('contain.text', 'manager');

    cy.contains('button', /register user/i).click();
    cy.contains('h2, .MuiDialogTitle-root', /register tenant user/i).should('be.visible');
    fillByLabel('Name', 'Cycle A Duplicate Cashier');
    fillByLabel('Email', 'manager@example.com');
    fillByLabel('Password', 'Runtime@123');
    cy.contains('.MuiDialog-root button', /create user|create/i).click();

    cy.wait('@createUser').its('response.statusCode').should('eq', 409);

    cy.contains('User already registered for tenant').should('be.visible');
    cy.contains('h2, .MuiDialogTitle-root', /register tenant user/i).should('be.visible');
    inputByLabel('Name').should('have.value', 'Cycle A Duplicate Cashier');
    inputByLabel('Email').should('have.value', 'manager@example.com');
    cy.contains('tr', 'Cycle A Manager')
      .should('contain.text', 'manager@example.com')
      .and('contain.text', 'manager');
    cy.contains('tr', 'Cycle A Duplicate Cashier').should('not.exist');

    cy.wrap(null).then(() => {
      expect(createWrites).to.equal(1);
      expect(userReads).to.equal(1);
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-user-create-failure-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
