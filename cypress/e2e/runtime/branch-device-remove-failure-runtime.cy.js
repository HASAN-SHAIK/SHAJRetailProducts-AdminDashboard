const tenantId = '42';
const branchId = '7';
const deviceId = '11';

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

const branch = {
  id: Number(branchId),
  name: 'Main Branch',
  location: 'Hyderabad',
  subscription_plan: 'pro',
  max_devices_allowed: 2,
  created_at: '2026-09-01T00:00:00Z'
};

const device = {
  id: Number(deviceId),
  device_id: 'POS-MAIN-01',
  device_name: 'Counter POS',
  is_active: true,
  last_login_at: '2026-09-05T08:00:00Z'
};

describe('Admin runtime - branch device removal failure', () => {
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
      body: { branches: [branch] }
    }).as('branches');
    cy.intercept('GET', `**/tenants/${tenantId}/branches/${branchId}/devices`, {
      statusCode: 200,
      body: { data: { active_count: 1, branch, devices: [device] } }
    }).as('devices');
  });

  it('surfaces deactivation failure without removing the active device or losing retry/session state', () => {
    cy.intercept(
      'PATCH',
      `**/tenants/${tenantId}/branches/${branchId}/devices/${deviceId}/deactivate`,
      (req) => {
        expect(req.headers.authorization).to.equal('Bearer cycle-a-runtime-token');
        req.reply({ statusCode: 500, body: { message: 'Device service unavailable' } });
      }
    ).as('removeDevice');

    cy.visit(`/admin/tenants/${tenantId}`, {
      onBeforeLoad(win) {
        cy.stub(win, 'confirm').returns(true);
        win.localStorage.setItem('shaj_admin_token', 'cycle-a-runtime-token');
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Admin', email: 'admin@example.com' })
        );
      }
    });

    cy.wait(['@tenant', '@users', '@branches']);
    cy.contains('tr', 'Main Branch').within(() => cy.contains('button', /^devices$/i).click());
    cy.wait('@devices');

    cy.contains('.MuiDialogTitle-root', /branch devices/i).should('be.visible');
    cy.contains(/active devices:\s*1/i).should('be.visible');
    cy.contains('tr', 'Counter POS').as('deviceRow');
    cy.get('@deviceRow').should('contain.text', 'Active');
    cy.get('@deviceRow').within(() => cy.contains('button', /^remove$/i).click());

    cy.wait('@removeDevice').its('response.statusCode').should('eq', 500);

    cy.contains(/device service unavailable/i).should('be.visible');
    cy.contains(/active devices:\s*1/i).should('be.visible');
    cy.contains('tr', 'Counter POS').should('contain.text', 'Active');
    cy.contains('tr', 'Counter POS').within(() => {
      cy.contains('button', /^remove$/i).should('be.visible').and('not.be.disabled');
    });

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-runtime-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
