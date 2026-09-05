describe("V1 Admin activity logs filter success runtime", () => {
  it("renders successful activity logs and refetches authoritative state for the selected admin filter", () => {
    let requestCount = 0;

    cy.intercept("GET", "**/activity-logs*", (req) => {
      requestCount += 1;
      expect(req.headers.authorization).to.eq("Bearer cycle-a-logs-success-token");

      const url = new URL(req.url);
      const admin = url.searchParams.get("admin");

      if (admin === "ops@example.com") {
        req.reply({
          statusCode: 200,
          body: {
            data: {
              logs: [
                {
                  id: 202,
                  admin_name: "Ops Admin",
                  admin_email: "ops@example.com",
                  action: "UPDATE_PLAN",
                  entity_type: "subscription",
                  entity_id: 42,
                  metadata: { plan: "PRO" },
                  created_at: "2026-09-05T21:15:00.000Z"
                }
              ]
            }
          }
        });
        return;
      }

      expect(admin).to.eq(null);
      req.reply({
        statusCode: 200,
        body: {
          data: {
            logs: [
              {
                id: 201,
                admin_name: "Cycle A Admin",
                admin_email: "cycle-a@example.com",
                action: "CREATE_TENANT",
                entity_type: "tenant",
                entity_id: 7,
                metadata: { name: "Cycle A Tenant" },
                created_at: "2026-09-05T20:15:00.000Z"
              },
              {
                id: 202,
                admin_name: "Ops Admin",
                admin_email: "ops@example.com",
                action: "UPDATE_PLAN",
                entity_type: "subscription",
                entity_id: 42,
                metadata: { plan: "PRO" },
                created_at: "2026-09-05T21:15:00.000Z"
              }
            ]
          }
        }
      });
    }).as("logsRead");

    cy.visit("/admin/logs", {
      onBeforeLoad(win) {
        win.localStorage.setItem("shaj_admin_token", "cycle-a-logs-success-token");
        win.localStorage.setItem(
          "shaj_admin_profile",
          JSON.stringify({ id: 7, name: "Cycle A Admin", role: "platform_admin" })
        );
      }
    });

    cy.wait("@logsRead").its("response.statusCode").should("eq", 200);
    cy.contains("h4", "Activity Logs").should("be.visible");
    cy.contains("201").should("be.visible");
    cy.contains("Cycle A Admin").should("be.visible");
    cy.contains("CREATE_TENANT").should("be.visible");
    cy.contains("202").should("be.visible");
    cy.contains("Ops Admin").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");

    cy.get('div[role="combobox"]').first().click();
    cy.contains('[role="option"]', "ops@example.com").click();

    cy.wait("@logsRead").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(new URL(interception.request.url).searchParams.get("admin")).to.eq("ops@example.com");
    });

    cy.contains("202").should("be.visible");
    cy.contains("Ops Admin").should("be.visible");
    cy.contains("UPDATE_PLAN").should("be.visible");
    cy.contains("201").should("not.exist");
    cy.contains("CREATE_TENANT").should("not.exist");
    cy.location("pathname").should("eq", "/admin/logs");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("shaj_admin_token")).to.eq("cycle-a-logs-success-token");
      expect(win.localStorage.getItem("shaj_admin_profile")).to.not.eq(null);
      expect(requestCount).to.eq(2);
    });
  });
});
