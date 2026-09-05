const tenantId = '42';
const branchId = '7';

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

const branchBefore = {
  id: Number(branchId),
  name: 'Main Branch',
  location: 'Hyderabad',
  subscription_plan: 'pro',
  max_devices_allowed: 2,
  created_at: '2026-09-01T00:00:00Z'
};

describe('Admin runtime - branch device-limit update failure', () => {
  beforeEach(() => {
    cy.intercept('GET', `**/tenant/${tenantId}`, {
      statusCode: 200,
      body: { data: { tenant } }
    }).as('tenant');
    cy.intercept('GET', `**/tenants/${tenantId}/users`, {
      statusCode: 200,
      body: { users: [] }
    }).as('users');
    cy.intercept('GET', `**/tenants/${tenantId}/branches`, {
      statusCode: 200,
      body: { branches: [branchBefore] }
    }).as('branches');
  });

  it('surfaces the API failure without mutating the branch or losing retry state/session', () => {
    cy.intercept('PATCH', `**/tenants/${tenantId}/branches/${branchId}`, (req) => {
      expect(req.body).to.deep.equal({ max_devices_allowed: 5 });
      req.reply({
        statusCode: 500,
        body: { message: 'Branch service unavailable' }
      });
    }).as('updateLimit');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-runtime-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait(['@tenant', '@users', '@branches']);
    cy.contains('h4', /tenant details/i).should('be.visible');
    cy.contains('tr', 'Main Branch').as('branchRow');
    cy.get('@branchRow').should('contain.text', '2');
    cy.get('@branchRow').within(() => cy.contains('button', /edit limit/i).click());

    cy.contains('.MuiDialogTitle-root', /edit branch device limit/i).should('be.visible');
    cy.contains('.MuiDialog-root label', /^max devices allowed$/i)
      .invoke('attr', 'for')
      .then((fieldId) => {
        expect(fieldId).to.be.a('string').and.not.be.empty;
        cy.document().then((doc) => {
          const field = doc.getElementById(fieldId);
          expect(field, `input with id ${fieldId}`).to.exist;
          cy.wrap(field).clear().type('5');
        });
      });

    cy.contains('.MuiDialog-root button', /^save$/i).click();
    cy.wait('@updateLimit');

    cy.contains('.MuiDialogTitle-root', /edit branch device limit/i).should('be.visible');
    cy.contains(/branch service unavailable/i).should('be.visible');
    cy.contains('.MuiDialog-root label', /^max devices allowed$/i)
      .invoke('attr', 'for')
      .then((fieldId) => {
        cy.document().then((doc) => {
          const field = doc.getElementById(fieldId);
          expect(field).to.exist;
          cy.wrap(field).should('have.value', '5');
        });
      });
    cy.contains('.MuiDialog-root button', /^save$/i).should('be.visible').and('not.be.disabled');

    cy.contains('tr', 'Main Branch').should('contain.text', '2');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-runtime-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
