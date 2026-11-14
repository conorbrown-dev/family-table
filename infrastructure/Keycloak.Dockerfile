FROM quay.io/keycloak/keycloak:26.4
COPY --chown=keycloak:keycloak keycloak-realm.json /opt/keycloak/data/import/familytable.json
COPY --chown=keycloak:keycloak keycloak/themes /opt/keycloak/themes
