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

const fillByLabel = (label, value) => {
  cy.contains('label', new RegExp(`^${label}$`, 'i'))
    .invoke('attr', 'for')
    .then((fieldId) => {
      if (!fieldId) throw new Error(`No input id found for label "${label}"`);
      cy.get(`#${fieldId}`).clear().type(String(value));
    });
};

describe('Admin runtime - tenant user create partial response', () => {
  it('preserves submitted user identity when a successful create response is partial', () => {
    let userReads = 0;
    let createWrites = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, {
      statusCode: 200,
      body: { data: { tenant } }
    }).as('tenant');
    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-create-token');
      req.reply({ statusCode: 200, body: { users: [retainedUser] } });
    }).as('users');
    cy.intercept('GET', `**/tenants/${tenantId}/branches`, {
      statusCode: 200,
      body: { branches: [] }
    }).as('branches');
    cy.intercept('POST', `**/tenants/${tenantId}/users`, (req) => {
      createWrites += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-create-token');
      expect(req.body).to.deep.equal({
        name: 'Cycle A New Cashier',
        email: 'new.cashier@example.com',
        password: 'Runtime@123',
        role: 'admin',
        all_branch_access: true
      });
      req.reply({
        statusCode: 201,
        body: { user: { id: 83 } }
      });
    }).as('createUser');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-user-create-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait(['@tenant', '@users', '@branches']);
    cy.contains('tr', 'Cycle A Manager').should('contain.text', 'manager@example.com');

    cy.contains('button', /register user/i).click();
    cy.contains('h2, .MuiDialogTitle-root', /register tenant user/i).should('be.visible');
    fillByLabel('Name', 'Cycle A New Cashier');
    fillByLabel('Email', 'new.cashier@example.com');
    fillByLabel('Password', 'Runtime@123');
    cy.contains('.MuiDialog-root button', /create user|create/i).click();

    cy.wait('@createUser').its('response.statusCode').should('eq', 201);

    // A valid partial success response must not erase the identity/context just submitted.
    cy.contains('tr', 'Cycle A New Cashier')
      .should('contain.text', 'new.cashier@example.com')
      .and('contain.text', 'admin');
    cy.contains('tr', 'Cycle A Manager')
      .should('contain.text', 'manager@example.com')
      .and('contain.text', 'manager');
    cy.contains('h2, .MuiDialogTitle-root', /register tenant user/i).should('not.exist');

    cy.wrap(null).then(() => {
      expect(createWrites).to.equal(1);
      expect(userReads).to.equal(1);
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-user-create-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
