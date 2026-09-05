const fillByLabel = (label, value) => {
  cy.contains('label', new RegExp(`^${label}$`, 'i'))
    .invoke('attr', 'for')
    .then((fieldId) => {
      if (!fieldId) throw new Error(`No input id found for label "${label}"`);
      cy.get(`#${fieldId}`).clear().type(String(value));
    });
};

describe('Admin runtime - platform admin registration', () => {
  it('submits the real Settings form, shows success, and resets the form', () => {
    const token = 'cycle-a-platform-admin-token';
    const payload = {
      name: 'Cycle A Platform Admin',
      email: 'cycle.a.platform.admin@example.com',
      password: 'CycleA@12345',
      role: 'platform_admin',
    };

    cy.intercept('POST', '**/auth/admins', (req) => {
      expect(req.headers.authorization).to.equal(`Bearer ${token}`);
      expect(req.body).to.deep.equal(payload);
      req.reply({
        statusCode: 201,
        body: {
          admin: {
            id: 901,
            name: payload.name,
            email: payload.email,
            role: payload.role,
          },
        },
      });
    }).as('registerPlatformAdmin');

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
    cy.wait('@registerPlatformAdmin');

    cy.contains(/Admin created/i, { timeout: 10000 }).should('be.visible');
    cy.contains('button', /^Create Admin$/i).should('be.visible').and('not.be.disabled');

    cy.contains('label', /^Name$/i).invoke('attr', 'for').then((id) => {
      cy.get(`#${id}`).should('have.value', '');
    });
    cy.contains('label', /^Email$/i).invoke('attr', 'for').then((id) => {
      cy.get(`#${id}`).should('have.value', '');
    });
    cy.contains('label', /^Password$/i).invoke('attr', 'for').then((id) => {
      cy.get(`#${id}`).should('have.value', '');
    });

    cy.location('pathname').should('eq', '/admin/settings');
  });
});
