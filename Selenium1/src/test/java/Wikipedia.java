import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class Wikipedia {
    public static void main(String[] args) throws Exception {
        WebDriverManager.chromedriver().setup();
        WebDriver dr = new ChromeDriver();
        dr.manage().window().maximize();
        dr.get("https://www.wikipedia.org/");

        Thread.sleep(2000);
        dr.findElement(By.id("searchInput")).sendKeys("The Alchemist");
        Thread.sleep(2000);
        System.out.println("typed");
        dr.findElement(By.xpath("//i[text()='Search']")).click();
        Thread.sleep(2000);
        System.out.println("Clicked");

        JavascriptExecutor js = (JavascriptExecutor) dr;
        WebDriverWait wait = new WebDriverWait(dr, Duration.ofSeconds(10));
        Thread.sleep(2000);
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//a[text()='Developers']")));
        js.executeScript("arguments[0].scrollIntoView('true')", element);
        Thread.sleep(2000);
        js.executeScript("arguments[0].click()",element);
        System.out.println("Clicked on developers");

        dr.close();
    }
}
