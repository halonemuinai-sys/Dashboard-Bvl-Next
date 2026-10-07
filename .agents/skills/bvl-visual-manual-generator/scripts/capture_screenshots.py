import os
import time
from playwright.sync_api import sync_playwright

COOKIE_TOKEN = "eyJlbWFpbCI6ImFyaXNAbXJhcmV0YWlsLmNvLmlkIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzkxOTU4MjUwMTIwfQ==.1523532a45f9c8cbf9010fdc466b1a07bf29e936164091eff5ee6da7fd23cf06"
BASE_URL = "https://bvl.mogems.co.id"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

def capture_all_screenshots():
    print(f"Starting screenshot capture to {OUT_DIR}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        context.add_cookies([{
            "name": "session_token",
            "value": COOKIE_TOKEN,
            "domain": "bvl.mogems.co.id",
            "path": "/"
        }])
        
        page = context.new_page()
        
        targets = [
            ("1_operations_sales.png", f"{BASE_URL}/operations-sales", None),
            ("2_daily_report.png", f"{BASE_URL}/daily-report", None),
            ("2b_daily_email_modal.png", f"{BASE_URL}/daily-report", "button:has-text('Send Email')"),
            ("3_advisor_setup.png", f"{BASE_URL}/advisor-setup", None),
            ("4_sales_journal.png", f"{BASE_URL}/sales-journal", None),
            ("5_crm_traffic.png", f"{BASE_URL}/crm-dedup", None),
            ("6_invoice_management.png", f"{BASE_URL}/invoice-management", None),
            ("7_installment_guide.png", f"{BASE_URL}/installment-guide", None),
            ("8_advisor_performance.png", f"{BASE_URL}/advisor-performance", None),
        ]
        
        for filename, url, click_selector in targets:
            print(f"Capturing {filename} from {url}...")
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(2000)
                if click_selector:
                    btn = page.locator(click_selector).first
                    if btn.is_visible():
                        btn.click()
                        page.wait_for_timeout(2500)
                save_path = os.path.join(OUT_DIR, filename)
                page.screenshot(path=save_path)
                print(f"Saved: {save_path}")
            except Exception as e:
                print(f"Error capturing {filename}: {e}")
                
        browser.close()
        print("Done capturing all screenshots.")

if __name__ == "__main__":
    capture_all_screenshots()
