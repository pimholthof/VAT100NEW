-- ═══════════════════════════════════════════════════════════════════
-- Enforce invoice status transitions at database level
-- Geldige overgangen: draft → sent → paid | overdue
-- Betaalde facturen zijn onwijzigbaar
-- ═══════════════════════════════════════════════════════════════════

create or replace function enforce_invoice_status_transition()
returns trigger language plpgsql as $$
begin
  -- Betaalde facturen mogen niet gewijzigd worden
  if OLD.status = 'paid' then
    raise exception 'Betaalde facturen kunnen niet gewijzigd worden';
  end if;

  -- Sent mag niet terug naar draft
  if OLD.status = 'sent' and NEW.status = 'draft' then
    raise exception 'Verzonden facturen kunnen niet terug naar concept';
  end if;

  -- Overdue mag niet terug naar draft
  if OLD.status = 'overdue' and NEW.status = 'draft' then
    raise exception 'Verlopen facturen kunnen niet terug naar concept';
  end if;

  return NEW;
end;
$$;

create trigger trg_invoice_status_transition
  before update of status on invoices
  for each row execute function enforce_invoice_status_transition();
