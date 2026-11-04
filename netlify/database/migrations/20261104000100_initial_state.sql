-- A locked singleton aggregate keeps the small demo's award decisions atomic.
-- Split into indexed relational tables before operating a high-volume service.
CREATE TABLE ghostcommits_state (
  id integer PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL
);
INSERT INTO ghostcommits_state (id, payload)
VALUES (1, '{"submissions":[],"claims":[],"bounties":[],"challenges":{},"sessions":{},"oauth":{},"maintainers":{}}');
