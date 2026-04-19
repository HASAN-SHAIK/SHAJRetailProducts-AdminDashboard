const adminApiUrl = Cypress.env('adminApiUrl');

const fillByLabel = (label, value) => {
  cy.contains('label', new RegExp(`^${label}$`, 'i'))
    .invoke('attr', 'for')
    .then((fieldId) => {
      if (!fieldId) throw new Error(`No input id found for label "${label}"`);
      cy.get(`#${fieldId}`).clear().type(String(value));
    });
};

describe('Admin Smoke - Create Tenant and Register User', () => {
  let createdTenantId = null;

  beforeEach(() => {
    cy.adminLoginAndOpen('/admin/tenants');
  });

  afterEach(() => {
    if (!createdTenantId) return;
    cy.adminApiHeaders().then((headers) => {
      cy.request({
        method: 'PATCH',
        url: `${adminApiUrl}/update-tenant/${createdTenantId}`,
        headers,
        body: { status: 'Inactive' },
        failOnStatusCode: false,
      });
    });
    createdTenantId = null;
  });

  it('creates tenant and registers tenant user', () => {
    const stamp = Date.now();
    const tenantName = `Cypress Tenant ${stamp}`;
    const ownerName = `Owner ${stamp}`;
    const tenantEmail = `tenant.${stamp}@example.com`;
    const tenantDomain = `cytenant${stamp}`;
    const userName = `User ${stamp}`;
    const userEmail = `tenant.user.${stamp}@example.com`;
    const userPassword = `Cypress@${stamp}`;

    cy.contains('button', /create new tenant/i).click();
    cy.contains('h2, .MuiDialogTitle-root', /create tenant/i).should('be.visible');

    fillByLabel('Shop Name', tenantName);
    fillByLabel('Owner', ownerName);
    fillByLabel('Email', tenantEmail);
    fillByLabel('Domain Name', tenantDomain);
    fillByLabel('Mobile', `9${String(stamp).slice(-9)}`);
    fillByLabel('GST Number', `GST${String(stamp).slice(-8)}`);
    fillByLabel('Address Line', 'Cypress Street');
    fillByLabel('City', 'Test City');
    fillByLabel('State', 'Test State');
    fillByLabel('Pincode', '600001');
    fillByLabel('Subscription Amount', '999');

    cy.contains('.MuiDialog-root button', /^create$/i).click();

    cy.contains('td', tenantName, { timeout: 60000 }).should('be.visible');
    cy.contains('td', tenantName)
      .parents('tr')
      .within(() => {
        cy.contains('button', /view details/i).click();
      });

    cy.location('pathname', { timeout: 30000 })
      .should('match', /\/admin\/tenants\/\d+$/)
      .then((path) => {
        const id = String(path).split('/').pop();
        createdTenantId = id;
      });

    cy.contains('button', /register user/i, { timeout: 30000 }).click();
    cy.contains('h2, .MuiDialogTitle-root', /register tenant user/i).should('be.visible');

    fillByLabel('Name', userName);
    fillByLabel('Email', userEmail);
    fillByLabel('Password', userPassword);

    cy.contains('.MuiDialog-root button', /create user|create/i).click();

    cy.contains(userEmail, { timeout: 60000 }).should('be.visible');
    cy.contains(/user created:/i, { timeout: 30000 }).should('be.visible');
  });
});
