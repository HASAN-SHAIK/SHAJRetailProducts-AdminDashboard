describe("V1 Admin activity logs combined filter runtime", () => {
  it("preserves Admin while adding Action Type and converges to the authoritative combined-filter result", () => {
    let requestCount = 0;
    const fixtureAuth = "cycle-a-logs-combined-token";

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${fixtureAuth}`);
      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");
      expect(type).to.eq(null);

      if (requestCount === 1) {
        expect(admin).to.eq(null);
        expect(action).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 801, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 91, metadata: { name: "Cycle A Combined Tenant" }, created_at: "2026-09-08T05:00:00.000Z" },
          { id: 802, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 92, metadata: { plan: "PRO" }, created_at: "2026-09-08T05:10:00.000Z" },
          { id: 803, admin_name: "Other Admin", admin_email: "other@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 93, metadata: { plan: "BASIC" }, created_at: "2026-09-08T05:20:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 2) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 801, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 91, metadata: { name: "Cycle A Combined Tenant" }, created_at: "2026-09-08T05:00:00.000Z" },
          { id: 802, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 92, metadata: { plan: "PRO" }, created_at: "2026-09-08T05:10:00.000Z" }
        ] } } });
        return;
      }

      expect(requestCount).to.eq(3);
      expect(admin).to.eq("ops@example.com");
      expect(action).to.eq("UPDATE_PLAN");
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 802, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 92, metadata: { plan: "PRO", source: "combined-filter" }, created_at: "2026-09-08T05:10:00.000Z" }
      ] } } });
    }).as("logsRead");

    cy.visit("/admin/logs", { onBeforeLoad(win) {
      win.localStorage.setItem("shaj_admin_token", fixtureAuth);
      win.localStorage.setItem("shaj_admin_profile", JSON.stringify({ id: 12, name: "Cycle A Admin", role: "platform_admin" }));
    }});

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("801").should("be.visible");
    cy.contains("802").should("be.visible");
    cy.contains("803").should("be.visible");

    cy.get('div[role="combobox"]').eq(0).click();
    cy.contains('[role="option"]', "ops@example.com").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("801").should("be.visible");
    cy.contains("802").should("be.visible");
    cy.contains("803").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");

    cy.get('div[role="combobox"]').eq(1).click();
    cy.contains('[role="option"]', "UPDATE_PLAN").click();
    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const combinedUrl = new URL(interception.request.url);
      expect(combinedUrl.searchParams.get("admin")).to.eq("ops@example.com");
      expect(combinedUrl.searchParams.get("action")).to.eq("UPDATE_PLAN");
      expect(combinedUrl.searchParams.get("type")).to.eq(null);
    });

    cy.contains("802").should("be.visible");
    cy.contains("combined-filter").should("be.visible");
    cy.contains("801").should("not.exist");
    cy.contains("803").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "UPDATE_PLAN");
    cy.location("pathname").should("eq", "/admin/logs");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(fixtureAuth);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(3);
    });
  });
});