describe("V1 Admin activity logs Type reset preserving Admin + Action runtime", () => {
  it("removes Type while preserving Admin and Action and converges to the authoritative result", () => {
    let requestCount = 0;
    const fixtureAuth = "cycle-a-logs-type-reset-preserve-admin-action-token";

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
          { id: 1401, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 601, metadata: { source: "initial" }, created_at: "2026-09-08T11:00:00.000Z" },
          { id: 1402, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 602, metadata: { source: "initial" }, created_at: "2026-09-08T11:10:00.000Z" },
          { id: 1403, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 603, metadata: { source: "initial" }, created_at: "2026-09-08T11:20:00.000Z" },
          { id: 1404, admin_name: "Other Admin", admin_email: "other@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 604, metadata: { source: "initial" }, created_at: "2026-09-08T11:30:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 2) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq(null);
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1401, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 601, metadata: { source: "admin-filter" }, created_at: "2026-09-08T11:00:00.000Z" },
          { id: 1402, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 602, metadata: { source: "admin-filter" }, created_at: "2026-09-08T11:10:00.000Z" },
          { id: 1403, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 603, metadata: { source: "admin-filter" }, created_at: "2026-09-08T11:20:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 3) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq("UPDATE_PLAN");
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1402, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 602, metadata: { source: "admin-action-filter" }, created_at: "2026-09-08T11:10:00.000Z" },
          { id: 1403, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 603, metadata: { source: "admin-action-filter" }, created_at: "2026-09-08T11:20:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 4) {
        expect(admin).to.eq("ops@example.com");
        expect(action).to.eq("UPDATE_PLAN");
        expect(type).to.eq("updates_made");
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1402, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 602, metadata: { source: "three-filter" }, created_at: "2026-09-08T11:10:00.000Z" }
        ] } } });
        return;
      }

      expect(requestCount).to.eq(5);
      expect(admin).to.eq("ops@example.com");
      expect(action).to.eq("UPDATE_PLAN");
      expect(type).to.eq(null);
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 1402, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 602, metadata: { source: "type-reset-preserve-admin-action" }, created_at: "2026-09-08T11:10:00.000Z" },
        { id: 1403, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 603, metadata: { source: "type-reset-preserve-admin-action" }, created_at: "2026-09-08T11:20:00.000Z" }
      ] } } });
    }).as("logsRead");

    cy.visit("/admin/logs", { onBeforeLoad(win) {
      win.localStorage.setItem("shaj_admin_token", fixtureAuth);
      win.localStorage.setItem("shaj_admin_profile", JSON.stringify({ id: 18, name: "Cycle A Admin", role: "platform_admin" }));
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

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "All").click();
    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const finalUrl = new URL(interception.request.url);
      expect(finalUrl.searchParams.get("admin")).to.eq("ops@example.com");
      expect(finalUrl.searchParams.get("action")).to.eq("UPDATE_PLAN");
      expect(finalUrl.searchParams.get("type")).to.eq(null);
    });

    cy.contains("1402").should("be.visible");
    cy.contains("1403").should("be.visible");
    cy.contains("type-reset-preserve-admin-action").should("be.visible");
    cy.contains("1401").should("not.exist");
    cy.contains("1404").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "UPDATE_PLAN");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "All");
    cy.location("pathname").should("eq", "/admin/logs");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(fixtureAuth);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(5);
    });
  });
});
