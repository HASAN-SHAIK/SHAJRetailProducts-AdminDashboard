const tenantId = '42';

const users = [
  {
    id: 81,
    name: 'Cycle A Cashier',
    email: 'cashier@example.com',
    role: 'staff',
    all_branch_access: true
  }
];

const branches = [
  {
    id: 7,
    name: 'Main Branch',
    location: 'Hyderabad',
    subscription_plan: 'pro',
    max_devices_allowed: 2
  }
];

describe('Admin runtime - tenant detail initial-load failure containment', () => {
  it('fails closed when the authoritative tenant read fails even if users and branches independently succeed', () => {
    let tenantReads = 0;
    let userReads = 0;
    let branchReads = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, (req) => {
      tenantReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-tenant-detail-load-failure-token');
      req.reply({
        statusCode: 503,
        body: { message: 'Tenant detail service unavailable' }
      });
    }).as('tenant');

    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-tenant-detail-load-failure-token');
      req.reply({ statusCode: 200, body: { users } });
    }).as('users');

    cy.intercept('GET', `**/tenants/${tenantId}/branches`, (req) => {
      branchReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-tenant-detail-load-failure-token');
      req.reply({ statusCode: 200, body: { branches } });
    }).as('branches');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-tenant-detail-load-failure-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait('@tenant').its('response.statusCode').should('eq', 503);
    cy.wait('@users').its('response.statusCode').should('eq', 200);
    cy.wait('@branches').its('response.statusCode').should('eq', 200);

    cy.contains('Tenant detail service unavailable').should('be.visible');

    // The tenant itself is authoritative for this privileged surface. Successful
    // side reads must not leak a partially actionable tenant-management screen.
    cy.contains('h4', 'Tenant Details').should('not.exist');
    cy.contains('h6', 'Tenant Users').should('not.exist');
    cy.contains('h6', 'Branches').should('not.exist');
    cy.contains('cashier@example.com').should('not.exist');
    cy.contains('Main Branch').should('not.exist');
    cy.contains('button', /^register user$/i).should('not.exist');
    cy.contains('button', /^add branch$/i).should('not.exist');

    cy.wrap(null).then(() => {
      expect(tenantReads).to.equal(1);
      expect(userReads).to.equal(1);
      expect(branchReads).to.equal(1);
    });

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(
        'cycle-a-tenant-detail-load-failure-token'
      );
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
