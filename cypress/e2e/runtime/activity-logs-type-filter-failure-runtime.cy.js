describe("V1 Admin activity logs Type filter failure runtime", () => {
  it("surfaces a failed Type filter refetch without presenting stale unfiltered rows as filtered results", () => {
    const token = "cycle-a-logs-type-filter-failure-token";
    let requestCount = 0;

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq(`Bearer ${token}`);

      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");
      const action = url.searchParams.get("action");
      const type = url.searchParams.get("type");

      if (requestCount === 1) {
        expect(admin).to.eq(null);
        expect(action).to.eq(null);
        expect(type).to.eq(null);
        req.reply({
          statusCode: 200,
          body: {
            data: {
              logs: [
                {
                  id: 1601,
                  admin_name: "Cycle A Admin",
                  admin_email: "cycle-a@example.com",
                  action: "CREATE_TENANT",
                  entity_type: "tenant",
                  entity_id: 7,
                  metadata: { source: "initial-authoritative" },
                  created_at: "2026-09-08T16:00:00.000Z"
                },
                {
                  id: 1602,
                  admin_name: "Ops Admin",
                  admin_email: "ops@example.com",
                  action: "UPDATE_PLAN",
                  entity_type: "subscription",
                  entity_id: 42,
                  metadata: { source: "initial-authoritative" },
                  created_at: "2026-09-08T16:01:00.000Z"
                }
              ]
            }
          }
        });
        return;
      }

      expect(requestCount).to.eq(2);
      expect(admin).to.eq(null);
      expect(action).to.eq(null);
      expect(type).to.eq("updates_made");
      req.reply({
        statusCode: 500,
        body: { message: "Activity log type filter service unavailable" }
      });
    }).as("logsBoundary");

    cy.visit("/admin/logs", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", token);
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@logsBoundary").its("response.statusCode").should("eq", 200);
    cy.contains("h4", "Activity Logs").should("be.visible");
    cy.contains("1601").should("be.visible");
    cy.contains("CREATE_TENANT").should("be.visible");
    cy.contains("1602").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");

    cy.get('div[role="combobox"]').eq(2).click();
    cy.contains('[role="option"]', "Updates Made").click();

    cy.wait("@logsBoundary").its("response.statusCode").should("eq", 500);
    cy.contains("Activity log type filter service unavailable").should("be.visible");
    cy.contains("1601").should("not.exist");
    cy.contains("1602").should("not.exist");
    cy.get('div[role="combobox"]').eq(0).should("contain.text", "All");
    cy.get('div[role="combobox"]').eq(1).should("contain.text", "All");
    cy.get('div[role="combobox"]').eq(2).should("contain.text", "Updates Made");
    cy.location("pathname").should("eq", "/admin/logs");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq(token);
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(2);
    });
  });
});
