describe("V1 Admin activity logs admin reset runtime", () => {
  it("removes the Admin query and restores authoritative unfiltered state when reset to All", () => {
    let requestCount = 0;
    const fixtureAuth = "fixture-auth-value";

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${fixtureAuth}`);
      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      expect(url.searchParams.get("action")).to.eq(null);
      expect(url.searchParams.get("type")).to.eq(null);

      if (requestCount === 2) {
        expect(admin).to.eq("ops@example.com");
        req.reply({ statusCode: 200, body: { data: { logs: [{ id: 702, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 82, metadata: { plan: "PRO" }, created_at: "2026-09-08T04:15:00.000Z" }] } } });
        return;
      }

      expect(admin).to.eq(null);
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 701, admin_name: "Create Admin", admin_email: "create@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 30, metadata: { name: "Cycle A Admin Reset Tenant" }, created_at: "2026-09-08T04:00:00.000Z" },
        { id: 702, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 82, metadata: { plan: "PRO" }, created_at: "2026-09-08T04:15:00.000Z" }
      ] } } });
    }).as("logsRead");

    cy.visit("/admin/logs", { onBeforeLoad(win) {
      win.localStorage.setItem("shaj_admin_token", fixtureAuth);
      win.localStorage.setItem("shaj_admin_profile", JSON.stringify({ id: 11, name: "Cycle A Admin", role: "platform_admin" }));
    }});

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("701").should("be.visible");
    cy.contains("702").should("be.visible");

    cy.get('div[role="combobox"]').eq(0).click();
    cy.contains('[role="option"]', "ops@example.com").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("702").should("be.visible");
    cy.contains("701").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");

    cy.get('div[role="combobox"]').eq(0).click();
    cy.contains('[role="option"]', "All").click();
    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const resetUrl = new URL(interception.request.url);
      expect(resetUrl.searchParams.get("admin")).to.eq(null);
      expect(resetUrl.searchParams.get("action")).to.eq(null);
      expect(resetUrl.searchParams.get("type")).to.eq(null);
    });

    cy.contains("701").should("be.visible");
    cy.contains("702").should("be.visible");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "All");
    cy.location("pathname").should("eq", "/admin/logs");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(fixtureAuth);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(3);
    });
  });
});