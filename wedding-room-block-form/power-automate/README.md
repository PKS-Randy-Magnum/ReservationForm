# Backend: SharePoint List + Power Automate

**Canonical instructions:** see [../SETUP-ORDERED.md](../SETUP-ORDERED.md).

That document replaces earlier Excel-based and incomplete notes.

## Summary

- **Store:** Microsoft List `Wedding Room Planner` on personal SharePoint  
  Site: `https://aimhosp-my.sharepoint.com/personal/hongyu_dai_thelasallechicago_com`
- **Flow:** HTTP trigger → password → Switch on `action`
- **Not used:** Excel Online (requires admin approval in this tenant)

## Quick reference — Site Address vs List URL

Wrong (full list page):

```text
https://aimhosp-my.sharepoint.com/personal/.../Lists/Wedding%20Room%20Planner/AllItems.aspx
```

Right (Site Address only):

```text
https://aimhosp-my.sharepoint.com/personal/hongyu_dai_thelasallechicago_com
```

List Name: `Wedding Room Planner`

Field-by-field expressions: [FIELD-MAP.md](FIELD-MAP.md) (no Complete By column — that date lives in Payload only).
