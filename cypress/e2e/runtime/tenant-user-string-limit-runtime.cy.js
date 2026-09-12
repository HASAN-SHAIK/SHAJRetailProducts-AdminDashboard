const tenantId = '42';

const tenant = {
  id: Number(tenantId),
  shop_name: 'Cycle A String Limit Store',
  owner_name: 'Runtime Owner',
  email: 'runtime@example.com',
  mobile: '9999999999',
  plan_type: 'premium',
  status: 'Active',
  shop_details: { city: 'Hyderabad', state: 'Telangana' },
  plan_features: { max_users: '2' },
  subscription: { plan: 'premium' },
  addons: {}
};

const users = [
  { id: 101, name: 'Cycle A Admin', email: 'admin.string@example.com', role: 'admin', all_branch_access: true },
  { id: 102, name: 'Cycle A Cashier', email: 'cashier.string@example.com', role: 'staff', all_branch_access: true }
];

const branches = [
  { id: 7, name: 'Main Branch', location: 'Hyderabad', subscription_plan: 'premium', max_devices_allowed: 4 }
];

describe('Admin runtime - tenant user string max_users at capacity', () => {
  it('enforces capacity when authoritative max_users is serialized as a numeric string', () => {
    let tenantReads = 0;
    let userReads = 0;
    let branchReads = 0;
    let userCreates = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, (req) => {
      tenantReads += 1;
      req.reply({ statusCode: 200, body: { data: { tenant } } });
    }).as('tenant');

    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      req.reply({ statusCode: 200, body: { users } });
    }).as('users');

    cy.intercept('GET', `**/tenants/${tenantId}/branches`, (req) => {
      branchReads += 1;
      req.reply({ statusCode: 200, body: { branches } });
    }).as('branches');

    cy.intercept('POST', `**/tenants/${tenantId}/users`, (req) => {
      userCreates += 1;
      req.reply({ statusCode: 500, body: { message: 'unexpected create' } });
    }).as('unexpectedCreate');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'runtime-session');
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Admin' }));
      }
    });

    cy.wait('@tenant').its('response.statusCode').should('eq', 200);
    cy.wait('@users').its('response.statusCode').should('eq', 200);
    cy.wait('@branches').its('response.statusCode').should('eq', 200);

    cy.contains('h4', 'Tenant Details').should('be.visible');
    cy.get('input[value="Cycle A String Limit Store"]').should('exist');

    cy.contains('h6', 'Tenant Users')
      .should('be.visible')
      .closest('.MuiCardContent-root')
      .within(() => {
        cy.contains('button', /^register user$/i).should('be.disabled');
        cy.contains('User limit reached (2/2). Upgrade the plan to add more users.').should('be.visible');
        cy.contains('admin.string@example.com').should('be.visible');
        cy.contains('cashier.string@example.com').should('be.visible');
        cy.get('tbody tr').should('have.length', 2);
      });

    cy.contains('button', /^register user$/i).click({ force: true });
    cy.contains('Register Tenant User').should('not.exist');
    cy.contains('Main Branch').should('be.visible');
    cy.contains('Hyderabad').should('be.visible');

    cy.wrap(null).then(() => {
      expect(tenantReads).to.equal(1);
      expect(userReads).to.equal(1);
      expect(branchReads).to.equal(1);
      expect(userCreates).to.equal(0);
    });

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('runtime-session');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});