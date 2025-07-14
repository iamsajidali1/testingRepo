package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class Test2 {
    public static void main(String[] args) {
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();

        try {
            driver.get("https://www.facebook.com/");
            driver.manage().window().maximize();

            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email"))).sendKeys("iamsajidali@gmail.com");

            driver.findElement(By.id("pass")).sendKeys("sajidali");

            wait.until(ExpectedConditions.elementToBeClickable(By.partialLinkText("Forgotten"))).click();

            System.out.println("Clicked on forgotten password link.");
            driver.navigate().back();
            driver.findElement(By.id("pass")).sendKeys("sajidali");

            //xPath
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.linkText("Log in")));
            driver.findElement(By.xpath("//button[text()='Log in']")).click();
            System.out.println("Clicked on Log in link.");

            //cssSelector #id and .class
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.partialLinkText("Forgotten")));
            driver.findElement(By.cssSelector("a._97w4")).click();
            System.out.println("Clicked on Forgotten Account link.");

            wait.until((ExpectedConditions.visibilityOfElementLocated(By.name("did_submit"))));
            driver.findElement(By.cssSelector("button#did_submit")).click();
            System.out.println("Clicked on search link.");

            driver.navigate().to("https://tickets.paytm.com/bus/");
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//span[text()='Show AC Buses only']"))).click();
            System.out.println("Clicked on checkBox link.");
        } catch (Exception e) {
            System.out.println("Error occurred: " + e.getMessage());
        } finally {
//            driver.quit();
        }
    }
}
