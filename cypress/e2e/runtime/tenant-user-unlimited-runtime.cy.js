const tenantId = '42';

const tenant = {
  id: Number(tenantId),
  shop_name: 'Cycle A Unlimited User Store',
  owner_name: 'Runtime Owner',
  email: 'runtime@example.com',
  mobile: '9999999999',
  plan_type: 'premium',
  status: 'Active',
  shop_details: { city: 'Hyderabad', state: 'Telangana' },
  plan_features: { max_users: null },
  subscription: { plan: 'premium' },
  addons: {}
};

const users = [
  { id: 91, name: 'Cycle A Admin', email: 'admin.unlimited@example.com', role: 'admin', all_branch_access: true },
  { id: 92, name: 'Cycle A Cashier', email: 'cashier.unlimited@example.com', role: 'staff', all_branch_access: true },
  { id: 93, name: 'Cycle A Manager', email: 'manager.unlimited@example.com', role: 'manager', all_branch_access: true }
];

const branches = [
  {
    id: 7,
    name: 'Main Branch',
    location: 'Hyderabad',
    subscription_plan: 'premium',
    max_devices_allowed: null
  }
];

describe('Admin runtime - tenant user unlimited capacity', () => {
  it('keeps registration available when authoritative max_users is null despite existing users', () => {
    let tenantReads = 0;
    let userReads = 0;
    let branchReads = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, (req) => {
      tenantReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-unlimited-token');
      req.reply({ statusCode: 200, body: { data: { tenant } } });
    }).as('tenant');

    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-unlimited-token');
      req.reply({ statusCode: 200, body: { users } });
    }).as('users');

    cy.intercept('GET', `**/tenants/${tenantId}/branches`, (req) => {
      branchReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-unlimited-token');
      req.reply({ statusCode: 200, body: { branches } });
    }).as('branches');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-user-unlimited-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait('@tenant').its('response.statusCode').should('eq', 200);
    cy.wait('@users').its('response.statusCode').should('eq', 200);
    cy.wait('@branches').its('response.statusCode').should('eq', 200);

    cy.contains('h4', 'Tenant Details').should('be.visible');
    cy.get('input[value="Cycle A Unlimited User Store"]').should('exist');

    cy.contains('h6', 'Tenant Users')
      .should('be.visible')
      .closest('.MuiCardContent-root')
      .within(() => {
        cy.contains('button', /^register user$/i).should('be.enabled');
        cy.contains(/User limit reached/i).should('not.exist');
        cy.contains('admin.unlimited@example.com').should('be.visible');
        cy.contains('cashier.unlimited@example.com').should('be.visible');
        cy.contains('manager.unlimited@example.com').should('be.visible');
        cy.get('tbody tr').should('have.length', 3);
      });

    cy.contains('button', /^register user$/i).click();
    cy.contains('Register Tenant User').should('be.visible');
    cy.contains('button', /^cancel$/i).click();
    cy.contains('Register Tenant User').should('not.exist');

    cy.contains('Main Branch').should('be.visible');
    cy.contains('Hyderabad').should('be.visible');

    cy.wrap(null).then(() => {
      expect(tenantReads).to.equal(1);
      expect(userReads).to.equal(1);
      expect(branchReads).to.equal(1);
    });

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-user-unlimited-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
