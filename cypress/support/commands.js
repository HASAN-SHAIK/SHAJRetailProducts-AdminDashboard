Cypress.Commands.add('adminLogin', (email, password) => {
  const adminEmail = email || Cypress.env('adminEmail');
  const adminPassword = password || Cypress.env('adminPassword');

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Missing admin credentials. Set CYPRESS_ADMIN_EMAIL and CYPRESS_ADMIN_PASSWORD.'
    );
  }

  cy.visit('/admin/login');
  cy.get('input[name="email"]').clear().type(adminEmail);
  cy.get('input[name="password"]').clear().type(adminPassword, { log: false });
  cy.contains('button', /^login$/i).click();
  cy.location('pathname', { timeout: 60000 }).should('include', '/admin/dashboard');
});

Cypress.Commands.add('adminLoginAndOpen', (path = '/admin/dashboard') => {
  const adminEmail = Cypress.env('adminEmail');
  const adminPassword = Cypress.env('adminPassword');

  cy.session([adminEmail, adminPassword], () => {
    cy.adminLogin(adminEmail, adminPassword);
  });

  cy.visit(path);
  cy.location('pathname', { timeout: 30000 }).should('include', path);
});

Cypress.Commands.add('adminApiHeaders', () => {
  const email = Cypress.env('adminEmail');
  const password = Cypress.env('adminPassword');
  const apiUrl = Cypress.env('adminApiUrl');
  if (!email || !password) {
    throw new Error(
      'Missing admin credentials. Set CYPRESS_ADMIN_EMAIL and CYPRESS_ADMIN_PASSWORD.'
    );
  }
  return cy
    .request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: { email, password },
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status !== 200 || !res.body?.token) {
        throw new Error(`Admin API login failed (${res.status}). Check admin creds/API URL.`);
      }
      return { Authorization: `Bearer ${res.body.token}` };
    });
});
