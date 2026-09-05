const inputByLabel = (label) =>
  cy.contains('label', new RegExp(`^${label}$`, 'i'))
    .closest('.MuiFormControl-root')
    .find('input');

const fillByLabel = (label, value) => inputByLabel(label).clear().type(String(value));

describe('Admin runtime - platform admin registration', () => {
  it('submits the Settings form, shows success, and resets the form', () => {
    const token = 'cycle-a-platform-admin-token';
    const payload = {
      name: 'Cycle A Platform Admin',
      email: 'cycle.a.platform.admin@example.com',
      password: 'RuntimeTest123!',
      role: 'platform_admin',
    };

    cy.intercept('POST', '**/auth/admins', (req) => {
      expect(req.headers.authorization).to.equal(`Bearer ${token}`);
      expect(req.body).to.deep.equal(payload);
      req.reply({ statusCode: 201, body: { admin: { id: 901, name: payload.name, email: payload.email, role: payload.role } } });
    }).as('registerPlatformAdmin');

    cy.visit('/admin/settings', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem('shaj_admin_profile', JSON.stringify({ id: 1, name: 'Cycle A Operator', role: 'platform_admin' }));
      },
    });

    cy.contains('h4', /^Settings$/).should('be.visible');
    cy.contains(/Register Platform Admin/i).should('be.visible');
    fillByLabel('Name', payload.name);
    fillByLabel('Email', payload.email);
    fillByLabel('Password', payload.password);
    cy.contains('button', /^Create Admin$/i).click();
    cy.wait('@registerPlatformAdmin');

    cy.contains(/Admin created/i, { timeout: 10000 }).should('be.visible');
    cy.contains('button', /^Create Admin$/i).should('be.visible').and('not.be.disabled');
    inputByLabel('Name').should('have.value', '');
    inputByLabel('Email').should('have.value', '');
    inputByLabel('Password').should('have.value', '');
    cy.location('pathname').should('eq', '/admin/settings');
  });
});
