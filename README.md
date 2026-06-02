# Minimalist OpenRouter Chat (pro GitHub Pages)

Tato aplikace je připravena k okamžitému nasazení (deploymentu) na **GitHub Pages** bez nutnosti jakékoli konfigurace kódu nebo serverů.

## Jak aplikaci spustit na GitHub Pages zdarma a hned:

1. **Nahrajte tento kód na GitHub**:
   - Vytvořte si nový repozitář na GitHubu a nahrajte do něj celou složku s tímto projektem.

2. **Aktivujte automatický deployment přes GitHub Actions** (Zabere 10 sekund):
   - Jděte do nastavení vašeho repozitáře na GitHubu (**Settings**).
   - V levém menu klikněte na **Pages**.
   - V sekci **Build and deployment** najděte položku **Source** a změňte ji z *Deploy from a branch* na **GitHub Actions**.

3. **To je vše!**:
   - Jakmile tato změna proběhne (nebo jakmile připnete kód do větve `main` či `master`), automaticky se spustí přiložený GitHub Actions workflow.
   - Během 1-2 minut bude váš minimalistický chat online na adrese: `https://<vase-jmeno>.github.io/<nazev-depozitare>/`

## Vlastnosti aplikace
- **Zero Configuration**: Žádné složité nastavování, vše běží čistě v prohlížeči (client-side).
- **Bezpečné uložení klíče**: Váš OpenRouter API klíč se ukládá ultra-bezpečně pouze lokálně ve vašem prohlížeči (`localStorage`) a nikdy neunikne na servery třetích stran.
- **Využití jakýchkoli modelů**: Můžete použít jakýkoli model z OpenRouteru (např. `anthropic/claude-3.7-sonnet`, `meta-llama/llama-3-8b-instruct:free`, atd.).
