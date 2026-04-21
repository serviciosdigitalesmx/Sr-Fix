import os
import sys
import time
import shutil
from pathlib import Path
from urllib.parse import quote

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


def env(name, default=""):
    value = os.getenv(name, default)
    return value.strip() if isinstance(value, str) else value


def normalize_phone(raw):
    digits = "".join(ch for ch in str(raw or "") if ch.isdigit())
    if len(digits) == 10:
        return f"52{digits}"
    return digits


def build_message(folio, client_name, portal_url):
    parts = [
        f"Hola, {client_name}.",
        f"Tu equipo fue registrado con el folio {folio}.",
    ]
    if portal_url:
        parts.append(f"Puedes consultar el estado aquí:\n{portal_url}")
    return "\n\n".join(parts)


def build_portal_url(folio):
    template = env("SRFIX_PORTAL_URL_TEMPLATE")
    direct_url = env("SRFIX_PORTAL_URL")
    if direct_url:
        return direct_url
    if template:
        return template.replace("{folio}", quote(str(folio or "").strip().upper()))
    return ""


def prepare_chrome_profile():
    source_root = Path(env("CHROME_PROFILE_SOURCE", os.path.expanduser("~/Library/Application Support/Google/Chrome")))
    profile_name = env("CHROME_PROFILE_DIR", "Default")
    target_root = Path(env("WHATSAPP_CHROME_PROFILE_DIR", os.path.expanduser("~/.srfix-whatsapp-chrome")))
    target_root.mkdir(parents=True, exist_ok=True)

    local_state = source_root / "Local State"
    source_profile = source_root / profile_name
    target_profile = target_root / profile_name

    if local_state.exists() and not (target_root / "Local State").exists():
        shutil.copy2(local_state, target_root / "Local State")
    if source_profile.exists() and not target_profile.exists():
        shutil.copytree(source_profile, target_profile, dirs_exist_ok=True)

    return str(target_root), profile_name


def main():
    phone = normalize_phone(env("WHATSAPP_PHONE"))
    folio = env("SRFIX_FOLIO")
    client_name = env("SRFIX_CLIENT_NAME", "cliente")
    portal_url = build_portal_url(folio)
    wait_seconds = int(env("WHATSAPP_QR_WAIT_SECONDS", "60"))
    chrome_path = env("CHROME_BINARY_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    user_data_dir, profile_dir = prepare_chrome_profile()
    selenium_timeout = int(env("WHATSAPP_SELENIUM_TIMEOUT", "30"))
    headless = env("WHATSAPP_HEADLESS", "0") in {"1", "true", "TRUE", "yes", "YES"}

    if not phone:
        print("Falta WHATSAPP_PHONE", file=sys.stderr)
        return 1
    if not folio:
        print("Falta SRFIX_FOLIO", file=sys.stderr)
        return 1

    message = env(
        "SRFIX_WHATSAPP_MESSAGE",
        build_message(folio=folio, client_name=client_name, portal_url=portal_url),
    )

    opts = Options()
    opts.binary_location = chrome_path
    opts.add_argument(f"--user-data-dir={user_data_dir}")
    opts.add_argument(f"--profile-directory={profile_dir}")
    opts.add_argument("--disable-notifications")
    opts.add_argument("--start-maximized")
    opts.add_argument("--no-first-run")
    opts.add_argument("--no-default-browser-check")
    if headless:
        opts.add_argument("--headless=new")

    driver = webdriver.Chrome(options=opts)

    try:
        print("Abriendo WhatsApp Web en Chrome...")
        if headless:
            print("Modo headless activado. Cambia WHATSAPP_HEADLESS=0 para ver la ventana.")
        else:
            print("Modo visible activado. Chrome debe abrirse en pantalla para escanear el QR.")
        driver.get("https://web.whatsapp.com/")
        print(f"WhatsApp Web abierto. Escanea el QR dentro de {wait_seconds} segundos.")
        print("No se ejecutará ningún paso adicional hasta que termine la espera.")
        time.sleep(wait_seconds)

        print("Continuando con la verificación de sesión y el envío del mensaje...")
        chat_url = f"https://web.whatsapp.com/send?phone={phone}&text={quote(message)}"
        driver.get(chat_url)
        wait = WebDriverWait(driver, selenium_timeout)
        message_box = wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//footer//div[@role='textbox' or @contenteditable='true']",
                )
            )
        )
        message_box.click()
        message_box.send_keys(Keys.ENTER)

        print(f"Mensaje enviado al número {phone}")
        return 0
    except TimeoutException:
        print("TIMEOUT_DETAILS", file=sys.stderr)
        print(f"TITLE={driver.title}", file=sys.stderr)
        print(f"URL={driver.current_url}", file=sys.stderr)
        try:
            body = driver.find_element(By.TAG_NAME, "body").text[:1200]
            print(f"BODY={body}", file=sys.stderr)
        except Exception:
            pass
        print("No se detectó la interfaz autenticada de WhatsApp Web. Revisa el QR y vuelve a intentar.", file=sys.stderr)
        return 2
    finally:
        time.sleep(2)
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
