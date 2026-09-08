describe("V1 Admin activity logs Admin + Type filter runtime", () => {
  it("preserves Admin while adding Type and converges to the authoritative combined-filter result", () => {
    let requestCount = 0;
    const fixtureAuth = "cycle-a-logs-admin-type-token";

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${fixtureAuth}`);
      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");
      expect(action).to.eq(null);

      if (requestCount === 1) {
        expect(admin).to.eq(null);
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 901, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 101, metadata: { source: "initial" }, created_at: "2026-09-08T06:00:00.000Z" },
          { id: 902, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 102, metadata: { source: "initial" }, created_at: "2026-09-08T06:10:00.000Z" },
          { id: 903, admin_name: "Other Admin", admin_email: "other@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 103, metadata: { source: "initial" }, created_at: "2026-09-08T06:20:00.000Z" }
        ] } } });
        return;
      }

      if (requestCount === 2) {
        expect(admin).to.eq("ops@example.com");
        expect(type).to.eq(null);
        req.reply({ statusCode: 200, body: { data: { logs: [
          { id: 901, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "CREATE_TENANT", entity_type: "tenant", entity_id: 101, metadata: { source: "admin-filter" }, created_at: "2026-09-08T06:00:00.000Z" },
          { id: 902, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 102, metadata: { source: "admin-filter" }, created_at: "2026-09-08T06:10:00.000Z" }
        ] } } });
        return;
      }

      expect(requestCount).to.eq(3);
      expect(admin).to.eq("ops@example.com");
      expect(type).to.eq("updates_made");
      req.reply({ statusCode: 200, body: { data: { logs: [
        { id: 902, admin_name: "Ops Admin", admin_email: "ops@example.com", action: "UPDATE_PLAN", entity_type: "subscription", entity_id: 102, metadata: { source: "admin-type-filter" }, created_at: "2026-09-08T06:10:00.000Z" }
      ] } } });
    }).as("logsRead");

    cy.visit("/admin/logs", { onBeforeLoad(win) {
      win.localStorage.setItem("shaj_admin_token", fixtureAuth);
      win.localStorage.setItem("shaj_admin_profile", JSON.stringify({ id: 13, name: "Cycle A Admin", role: "platform_admin" }));
    }});

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("901").should("be.visible");
    cy.contains("902").should("be.visible");
    cy.contains("903").should("be.visible");

    cy.get('div[role="combobox"]').eq(0).click();
    cy.contains('[role="option"]', "ops@example.com").click();
    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("901").should("be.visible");
    cy.contains("902").should("be.visible");
    cy.contains("903").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "Updates Made").click();
    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const combinedUrl = new URL(interception.request.url);
      expect(combinedUrl.searchParams.get("admin")).to.eq("ops@example.com");
      expect(combinedUrl.searchParams.get("type")).to.eq("updates_made");
      expect(combinedUrl.searchParams.get("action")).to.eq(null);
    });

    cy.contains("902").should("be.visible");
    cy.contains("admin-type-filter").should("be.visible");
    cy.contains("901").should("not.exist");
    cy.contains("903").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "ops@example.com");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "Updates Made");
    cy.location("pathname").should("eq", "/admin/logs");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(fixtureAuth);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(3);
    });
  });
});
