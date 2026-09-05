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

const activeDevice = {
  id: Number(deviceId),
  device_id: 'POS-MAIN-01',
  device_name: 'Counter POS',
  is_active: true,
  last_login_at: '2026-09-05T08:00:00Z'
};

const inactiveDevice = {
  ...activeDevice,
  is_active: false
};

describe('Admin runtime - branch device removal success', () => {
  it('deactivates the selected device then refreshes active-count and visible device state', () => {
    let deviceReads = 0;

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
    cy.intercept('GET', `**/tenants/${tenantId}/branches/${branchId}/devices`, (req) => {
      deviceReads += 1;
      req.reply({
        statusCode: 200,
        body: {
          data: deviceReads === 1
            ? { active_count: 1, branch, devices: [activeDevice] }
            : { active_count: 0, branch, devices: [inactiveDevice] }
        }
      });
    }).as('devices');
    cy.intercept(
      'PATCH',
      `**/tenants/${tenantId}/branches/${branchId}/devices/${deviceId}/deactivate`,
      (req) => {
        expect(req.headers.authorization).to.equal('Bearer cycle-a-runtime-token');
        req.reply({
          statusCode: 200,
          body: { success: true, device: inactiveDevice }
        });
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

    cy.wait('@removeDevice').its('response.statusCode').should('eq', 200);
    cy.wait('@devices');

    cy.contains(/active devices:\s*0/i).should('be.visible');
    cy.contains('tr', 'Counter POS').should('contain.text', 'Removed');
    cy.contains('tr', 'Counter POS').within(() => {
      cy.contains('button', /^remove$/i).should('not.exist');
    });

    cy.wrap(null).then(() => {
      expect(deviceReads).to.equal(2);
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal('cycle-a-runtime-token');
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
    cy.location('pathname').should('eq', `/admin/tenants/${tenantId}`);
  });
});
