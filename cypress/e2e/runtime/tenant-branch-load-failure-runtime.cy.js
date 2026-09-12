const tenantId = '42';

const tenant = {
  id: Number(tenantId),
  shop_name: 'Cycle A Branch Load Store',
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

const users = [
  {
    id: 81,
    name: 'Cycle A Cashier',
    email: 'cashier@example.com',
    role: 'staff',
    all_branch_access: true
  }
];

describe('Admin runtime - tenant branch initial-load failure containment', () => {
  it('surfaces the authoritative branch-list failure without fabricating branches or destabilizing tenant/user context', () => {
    let tenantReads = 0;
    let userReads = 0;
    let branchReads = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, (req) => {
      tenantReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-branch-load-failure-token');
      req.reply({ statusCode: 200, body: { data: { tenant } } });
    }).as('tenant');

    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-branch-load-failure-token');
      req.reply({ statusCode: 200, body: { users } });
    }).as('users');

    cy.intercept('GET', `**/tenants/${tenantId}/branches`, (req) => {
      branchReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-branch-load-failure-token');
      req.reply({
        statusCode: 503,
        body: { message: 'Tenant branches service unavailable' }
      });
    }).as('branches');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-branch-load-failure-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait('@tenant').its('response.statusCode').should('eq', 200);
    cy.wait('@users').its('response.statusCode').should('eq', 200);
    cy.wait('@branches').its('response.statusCode').should('eq', 503);

    cy.contains('h4', 'Tenant Details').should('be.visible');
    cy.get('input[value="Cycle A Branch Load Store"]').should('exist');

    cy.contains('h6', 'Tenant Users').should('be.visible');
    cy.contains('cashier@example.com').should('be.visible');

    cy.contains('h6', 'Branches').should('be.visible');
    cy.contains('Tenant branches service unavailable').should('be.visible');
    cy.contains('button', /^add branch$/i).should('be.enabled');

    // A failed authoritative branch read must not fabricate branch rows or an empty-state success.
    cy.contains('Main Branch').should('not.exist');
    cy.contains('No branches created yet.').should('not.exist');

    cy.wrap(null).then(() => {
      expect(tenantReads).to.equal(1);
      expect(userReads).to.equal(1);
      expect(branchReads).to.equal(1);
    });

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(
        'cycle-a-branch-load-failure-token'
      );
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
