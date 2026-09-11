const tenantId = '42';

const tenant = {
  id: Number(tenantId),
  shop_name: 'Cycle A Test Store',
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

const existingBranch = {
  id: 7,
  name: 'Main Branch',
  location: 'Hyderabad',
  subscription_plan: 'pro',
  max_devices_allowed: 2,
  created_at: '2026-09-01T00:00:00Z'
};

describe('Admin runtime - tenant branch partial device-limit response', () => {
  it('preserves existing branch fields when a successful limit PATCH returns only changed fields', () => {
    let branchReads = 0;
    let branchUpdates = 0;

    cy.intercept('GET', `**/tenant/${tenantId}`, {
      statusCode: 200,
      body: { data: { tenant } }
    }).as('tenant');
    cy.intercept('GET', `**/tenants/${tenantId}/users`, {
      statusCode: 200,
      body: { users: [] }
    }).as('users');
    cy.intercept('GET', `**/tenants/${tenantId}/branches`, (req) => {
      branchReads += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-branch-partial-token');
      req.reply({ statusCode: 200, body: { branches: [existingBranch] } });
    }).as('branches');
    cy.intercept('PATCH', `**/tenants/${tenantId}/branches/${existingBranch.id}`, (req) => {
      branchUpdates += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-branch-partial-token');
      expect(req.body).to.deep.equal({ max_devices_allowed: 5 });
      req.reply({
        statusCode: 200,
        body: { branch: { id: existingBranch.id, max_devices_allowed: 5 } }
      });
    }).as('updateBranch');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-branch-partial-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait(['@tenant', '@users', '@branches']);
    cy.contains('tr', 'Main Branch').as('branchRow').should('contain.text', '2').and('contain.text', 'Hyderabad').and('contain.text', 'pro');
    cy.get('@branchRow').within(() => {
      cy.contains('button', /^edit limit$/i).click();
    });

    cy.contains('.MuiDialogTitle-root', /^edit branch device limit$/i).should('be.visible');
    cy.get('label').contains(/^Max Devices Allowed$/).invoke('attr', 'for').then((id) => {
      cy.get(`#${CSS.escape(id)}`).clear().type('5').should('have.value', '5');
    });
    cy.contains('.MuiDialog-root', 'Edit Branch Device Limit').within(() => {
      cy.contains('button', /^save$/i).click();
    });

    cy.wait('@updateBranch').its('response.statusCode').should('eq', 200);
    cy.contains('.MuiDialogTitle-root', /^edit branch device limit$/i).should('not.exist');
    cy.contains('tr', 'Main Branch')
      .should('contain.text', '5')
      .and('contain.text', 'Hyderabad')
      .and('contain.text', 'pro');

    cy.wrap(null).then(() => {
      expect(branchReads).to.equal(1);
      expect(branchUpdates).to.equal(1);
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-branch-partial-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
