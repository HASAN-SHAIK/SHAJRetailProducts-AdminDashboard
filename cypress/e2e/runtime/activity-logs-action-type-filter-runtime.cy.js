describe("V1 Admin activity logs Action + Type filter runtime", () => {
  it("preserves Action while adding Type and converges to the authoritative combined-filter result", () => {
    let requestCount = 0;
    const fixtureAuth = "cycle-a-logs-action-type-token";

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${fixtureAuth}`);
      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");
      expect(admin).to.eq(null);

      if (requestCount === 1) {
        expect(action).to.eq(null);
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1001, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 201, metadata: { source: "initial" }, created_at: "2026-09-08T07:00:00.000Z" },
          { id: 1002, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 202, metadata: { source: "initial" }, created_at: "2026-09-08T07:10:00.000Z" },
          { id: 1003, admin_name: "Other Admin", admin_email: "other@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 203, metadata: { source: "initial" }, created_at: "2026-09-08T07:20:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 2) {
        expect(action).to.eq("UPDATE_PLAN");
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 1002, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 202, metadata: { source: "action-filter" }, created_at: "2026-09-08T07:10:00.000Z" },
          { id: 1003, admin_name: "Other Admin", admin_email: "other@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 203, metadata: { source: "action-filter" }, created_at: "2026-09-08T07:20:00.000Z" }
        ] } } });
        return;
      }

      expect(requestCount).to.eq(3);
      expect(action).to.eq("UPDATE_PLAN");
      expect(type).to.eq("updates_made");
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 1002, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 202, metadata: { source: "action-type-filter" }, created_at: "2026-09-08T07:10:00.000Z" }
      ] } } });
    }).as("logsRead");

    cy.visit("/admin/logs", { onBeforeLoad(win) {
      win.localStorage.setItem("shaj_admin_token", fixtureAuth);
      win.localStorage.setItem("shaj_admin_profile", JSON.stringify({ id: 14, name: "Cycle A Admin", role: "platform_admin" }));
    }});

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("1001").should("be.visible");
    cy.contains("1002").should("be.visible");
    cy.contains("1003").should("be.visible");

    cy.get('div[role="combobox"]').eq(1).click();
    cy.contains('[role="option"]', "UPDATE_PLAN").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("1002").should("be.visible");
    cy.contains("1003").should("be.visible");
    cy.contains("1001").should("not.exist");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "UPDATE_PLAN");

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "Updates Made").click();
    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const combinedUrl = new URL(interception.request.url);
      expect(combinedUrl.searchParams.get("action")).to.eq("UPDATE_PLAN");
      expect(combinedUrl.searchParams.get("type")).to.eq("updates_made");
      expect(combinedUrl.searchParams.get("admin")).to.eq(null);
    });

    cy.contains("1002").should("be.visible");
    cy.contains("action-type-filter").should("be.visible");
    cy.contains("1001").should("not.exist");
    cy.contains("1003").should("not.exist");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "UPDATE_PLAN");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "Updates Made");
    cy.location("pathname").should("eq", "/admin/logs");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(fixtureAuth);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(3);
    });
  });
});
