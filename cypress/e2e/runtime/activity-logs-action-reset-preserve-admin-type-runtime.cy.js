describe("V1 Admin activity logs Action reset preserving Admin + Type runtime", () => {
  it("removes Action while preserving Admin and Type and converges to the authoritative result", () => {
    let requestCount = 0;
    const fixtureAuth = "cycle-a-logs-action-reset-preserve-admin-type-token";

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${fixtureAuth}`);
      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");

      if (requestCount === 1) {
        expect(admin).to.eq(null);
        expect(action).to.eq(null);
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1301, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 501, metadata: { source: "initial" }, created_at: "2026-09-08T10:00:00.000Z" },
          { id: 1302, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 502, metadata: { source: "initial" }, created_at: "2026-09-08T10:10:00.000Z" },
          { id: 1303, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "DELETE_TENANT", entity_type: "tenant", entity_id: 503, metadata: { source: "initial" }, created_at: "2026-09-08T10:20:00.000Z" },
          { id: 1304, admin_name: "Other Admin", admin_email: "other@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 504, metadata: { source: "initial" }, created_at: "2026-09-08T10:30:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 2) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq(null);
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1301, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 501, metadata: { source: "admin-filter" }, created_at: "2026-09-08T10:00:00.000Z" },
          { id: 1302, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 502, metadata: { source: "admin-filter" }, created_at: "2026-09-08T10:10:00.000Z" },
          { id: 1303, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "DELETE_TENANT", entity_type: "tenant", entity_id: 503, metadata: { source: "admin-filter" }, created_at: "2026-09-08T10:20:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 3) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq("UPDATE_PLAN");
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1302, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 502, metadata: { source: "admin-action-filter" }, created_at: "2026-09-08T10:10:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 4) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq("UPDATE_PLAN");
        expect(type).to.eq("updates_made");
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1302, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 502, metadata: { source: "three-filter" }, created_at: "2026-09-08T10:10:00.000Z" }
        ] } } });
        return;
      }

      expect(requestCount).to.eq(5);
      expect(admin).to.eq("ops@example.com");
      expect(action).to.eq(null);
      expect(type).to.eq("updates_made");
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 1302, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 502, metadata: { source: "action-reset-preserve-admin-type" }, created_at: "2026-09-08T10:10:00.000Z" },
        { id: 1303, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "DELETE_TENANT", entity_type: "tenant", entity_id: 503, metadata: { source: "action-reset-preserve-admin-type" }, created_at: "2026-09-08T10:20:00.000Z" }
      ] } } });
    }).as("logsRead");

    cy.visit("/admin/logs", { onBeforeLoad(win) {
      win.localStorage.setItem("shaj_admin_token", fixtureAuth);
      win.localStorage.setItem("shaj_admin_profile", JSON.stringify({ id: 17, name: "Cycle A Admin", role: "platform_admin" }));
    }});

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.get('div[role="combobox"]').eq(0).click();
    cy.contains('[role="option"]', "ops@example.com").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);

    cy.get('div[role="combobox"]').eq(1).click();
    cy.contains('[role="option"]', "UPDATE_PLAN").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "Updates Made").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("three-filter").should("be.visible");

    cy.get('div[role="combobox"]').eq(1).click();
    cy.contains('[role="option"]', "All").click();
    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const finalUrl = new URL(interception.request.url);
      expect(finalUrl.searchParams.get("admin")).to.eq("ops@example.com");
      expect(finalUrl.searchParams.get("action")).to.eq(null);
      expect(finalUrl.searchParams.get("type")).to.eq("updates_made");
    });

    cy.contains("1302").should("be.visible");
    cy.contains("1303").should("be.visible");
    cy.contains("action-reset-preserve-admin-type").should("be.visible");
    cy.contains("1301").should("not.exist");
    cy.contains("1304").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "All");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "Updates Made");
    cy.location("pathname").should("eq", "/admin/logs");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(fixtureAuth);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(5);
    });
  });
});
