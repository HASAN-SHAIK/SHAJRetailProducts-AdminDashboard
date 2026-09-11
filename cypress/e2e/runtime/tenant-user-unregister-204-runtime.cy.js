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

const removableUser = {
  id: 81,
  name: 'Cycle A Cashier',
  email: 'cashier@example.com',
  role: 'staff',
  all_branch_access: true,
  created_at: '2026-09-01T00:00:00Z'
};

const retainedUser = {
  id: 82,
  name: 'Cycle A Manager',
  email: 'manager@example.com',
  role: 'manager',
  all_branch_access: true,
  created_at: '2026-09-02T00:00:00Z'
};

describe('Admin runtime - tenant user unregister 204 response', () => {
  it('removes the successfully unregistered user when DELETE returns 204 No Content', () => {
    let userReads = 0;
    let unregisterWrites = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, {
      statusCode: 200,
      body: { data: { tenant } }
    }).as('tenant');
    cy.intercept('GET', `**/tenants/${tenantId}/users`, (req) => {
      userReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-unregister-token');
      req.reply({ statusCode: 200, body: { users: [removableUser, retainedUser] } });
    }).as('users');
    cy.intercept('GET', `**/tenants/${tenantId}/branches`, {
      statusCode: 200,
      body: { branches: [] }
    }).as('branches');
    cy.intercept('DELETE', `**/tenants/${tenantId}/users/${removableUser.id}`, (req) => {
      unregisterWrites += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-user-unregister-token');
      req.reply({ statusCode: 204, body: '' });
    }).as('unregisterUser');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-user-unregister-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
        cy.stub(win, 'confirm').returns(true);
      }
    });

    cy.wait(['@tenant', '@users', '@branches']);
    cy.contains('tr', 'Cycle A Cashier').should('contain.text', 'cashier@example.com').as('cashierRow');
    cy.contains('tr', 'Cycle A Manager').should('be.visible');

    cy.get('@cashierRow').within(() => {
      cy.contains('button', /^unregister$/i).click();
    });

    cy.wait('@unregisterUser').its('response.statusCode').should('eq', 204);

    // A successful DELETE with a standards-compliant 204 must converge local UI state.
    cy.contains('tr', 'Cycle A Cashier').should('not.exist');
    cy.contains('tr', 'Cycle A Manager')
      .should('contain.text', 'manager@example.com')
      .and('contain.text', 'manager');

    cy.wrap(null).then(() => {
      expect(unregisterWrites).to.equal(1);
      expect(userReads).to.equal(1);
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-user-unregister-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
