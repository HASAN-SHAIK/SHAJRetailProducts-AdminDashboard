const inputByLabel = (label) =>
  cy.contains('label', new RegExp(`^${label}$`, 'i'))
    .closest('.MuiFormControl-root')
    .find('input');

const fillByLabel = (label, value) => inputByLabel(label).clear().type(String(value));

describe('Admin runtime - platform admin registration failure', () => {
  it('surfaces API failure, preserves retry input, and keeps the session usable', () => {
    const token = 'cycle-a-platform-admin-failure-token';
    const payload = {
      name: 'Cycle A Retry Admin',
      email: 'cycle.a.retry.admin@example.com',
      password: 'RuntimeTest123!',
      role: 'platform_admin',
    };

    cy.intercept('POST', '**/auth/admins', (req) => {
      expect(req.headers.authorization).to.equal(`Bearer ${token}`);
      expect(req.body).to.deep.equal(payload);
      req.reply({ statusCode: 500, body: { message: 'Admin service unavailable' } });
    }).as('registerPlatformAdminFailure');

    cy.visit('/admin/settings', {
      onBeforeLoad(win) {
        win.localStorage.setItem('shaj_admin_token', token);
        win.localStorage.setItem(
          'shaj_admin_profile',
          JSON.stringify({ id: 1, name: 'Cycle A Operator', role: 'platform_admin' })
        );
      },
    });

    cy.contains('h4', /^Settings$/).should('be.visible');
    cy.contains(/Register Platform Admin/i).should('be.visible');
    fillByLabel('Name', payload.name);
    fillByLabel('Email', payload.email);
    fillByLabel('Password', payload.password);
    cy.contains('button', /^Create Admin$/i).click();
    cy.wait('@registerPlatformAdminFailure').its('response.statusCode').should('eq', 500);

    cy.contains(/Admin service unavailable/i).should('be.visible');
    cy.contains('button', /^Create Admin$/i).should('be.visible').and('not.be.disabled');
    inputByLabel('Name').should('have.value', payload.name);
    inputByLabel('Email').should('have.value', payload.email);
    inputByLabel('Password').should('have.value', payload.password);
    cy.location('pathname').should('eq', '/admin/settings');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('shaj_admin_token')).to.equal(token);
      expect(win.localStorage.getItem('shaj_admin_profile')).to.not.equal(null);
    });
  });
});
