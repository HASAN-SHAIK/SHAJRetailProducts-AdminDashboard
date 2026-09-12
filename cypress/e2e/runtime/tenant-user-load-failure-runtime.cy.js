const tenantId = '42';

const tenant = {
  id: Number(tenantId),
  shop_name: 'Cycle A User Load Store',
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

const branch = {
  id: 7,
  name: 'Main Branch',
  location: 'Hyderabad',
  subscription_plan: 'pro',
  max_devices_allowed: 5,
  created_at: '2026-09-01T00:00:00Z'
};

describe('Admin runtime - tenant user initial-load failure containment', () => {
  it('surfaces the authoritative user-list failure without fabricating users or destabilizing tenant context', () => {
    let userReads = 0;
    let tenantReads = 0;
    let branchReads = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, (req) => {
      tenantReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-load-failure-token');
      req.reply({ statusCode: 200, body: { data: { tenant } } });
    }).as('tenant');

    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-load-failure-token');
      req.reply({
        statusCode: 503,
        body: { message: 'Tenant users service unavailable' }
      });
    }).as('users');

    cy.intercept('GET', `**/tenants/${tenantId}/branches`, (req) => {
      branchReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-load-failure-token');
      req.reply({ statusCode: 200, body: { branches: [branch] } });
    }).as('branches');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-user-load-failure-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait('@tenant').its('response.statusCode').should('eq', 200);
    cy.wait('@users').its('response.statusCode').should('eq', 503);
    cy.wait('@branches').its('response.statusCode').should('eq', 200);

    cy.contains('h4', 'Tenant Details').should('be.visible');
    cy.get('input[value="Cycle A User Load Store"]').should('exist');

    cy.contains('h6', 'Tenant Users').should('be.visible');
    cy.contains('Tenant users service unavailable').should('be.visible');
    cy.contains('button', /^register user$/i).should('be.enabled');

    // The failed authoritative list must not fabricate a user table/row.
    cy.contains('cashier@example.com').should('not.exist');
    cy.contains('manager@example.com').should('not.exist');
    cy.contains('h6', 'Branches').should('be.visible');
    cy.contains('Main Branch').should('be.visible');
    cy.contains('Hyderabad').should('be.visible');

    cy.wrap(null).then(() => {
      expect(tenantReads).to.equal(1);
      expect(userReads).to.equal(1);
      expect(branchReads).to.equal(1);
    });

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(
        'cycle-a-user-load-failure-token'
      );
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
