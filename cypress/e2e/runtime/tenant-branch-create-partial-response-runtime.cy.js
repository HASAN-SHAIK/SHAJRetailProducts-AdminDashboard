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

describe('Admin runtime - branch creation preserves submitted fields with partial authoritative response', () => {
  it('keeps submitted branch identity/context when HTTP 201 returns only id and derived device limit', () => {
    let branchReads = 0;
    let branchCreates = 0;

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
    cy.intercept('POST', `**/tenants/${tenantId}/branches`, (req) => {
      branchCreates += 1;
      expect(req.headers.authorization).to.equal('Bearer cycle-a-branch-partial-token');
      expect(req.body).to.deep.equal({
        name: 'Cycle A Partial Branch',
        location: 'Nalgonda',
        subscription_plan: 'enterprise'
      });
      req.reply({
        statusCode: 201,
        body: { branch: { id: 10, max_devices_allowed: null } }
      });
    }).as('createBranch');

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
    cy.contains('tr', 'Main Branch').should('contain.text', 'Hyderabad').and('contain.text', 'pro');

    cy.contains('button', /^add branch$/i).click();
    cy.contains('.MuiDialogTitle-root', /^create branch$/i).should('be.visible');

    cy.get('label').contains('Branch Name').invoke('attr', 'for').then((id) => {
      cy.get(`#${CSS.escape(id)}`).type('Cycle A Partial Branch');
    });
    cy.get('label').contains('Location').invoke('attr', 'for').then((id) => {
      cy.get(`#${CSS.escape(id)}`).type('Nalgonda');
    });
    cy.get('label').contains('Subscription Plan').invoke('attr', 'for').then((id) => {
      cy.get(`#${CSS.escape(id)}`).click();
    });
    cy.get('li[role="option"]').contains(/^enterprise$/i).click();
    cy.get('label').contains('Max Devices Allowed (optional)').invoke('attr', 'for').then((id) => {
      cy.get(`#${CSS.escape(id)}`).should('have.value', '');
    });

    cy.contains('.MuiDialog-root', 'Create Branch').within(() => {
      cy.contains('button', /^create branch$/i).click();
    });

    cy.wait('@createBranch').its('response.statusCode').should('eq', 201);
    cy.contains('.MuiDialogTitle-root', /^create branch$/i).should('not.exist');

    cy.contains('tr', 'Cycle A Partial Branch').as('createdRow');
    cy.get('@createdRow')
      .should('contain.text', 'Nalgonda')
      .and('contain.text', 'enterprise')
      .and('contain.text', 'Unlimited');
    cy.contains('tr', 'Main Branch').should('be.visible');

    cy.wrap(null).then(() => {
      expect(branchReads).to.equal(1);
      expect(branchCreates).to.equal(1);
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-branch-partial-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
