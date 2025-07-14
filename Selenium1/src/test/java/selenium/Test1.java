package selenium;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class Test1 {
    public static void main(String[] args) {
        System.setProperty("webdriver.chrome.driver", "C:\\Users\\Pc\\Desktop\\Train-testing\\chromedriver.exe");

        WebDriver driver = new ChromeDriver();
        driver.get("https://www.amazon.in/");
    }
}
