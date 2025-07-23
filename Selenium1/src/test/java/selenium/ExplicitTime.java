package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

public class ExplicitTime {
    public static void main(String[] args) throws Exception{
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        Thread.sleep(1000);
        driver.get("https://www.youtube.com/");
        Thread.sleep(1000);
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
//        WebElement shorts = driver.findElement(By.xpath("//a[@title='Shorts']"));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//a[@title='Shorts']"))).click();
        Thread.sleep(3000);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//a[@title='Home']"))).click();
        Thread.sleep(3000);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//div[text()='Music']"))).click();
        Thread.sleep(3000);

//        driver.findElement((By.xpath("//a[@title='Shorts']"))).click();

//        driver.findElement((By.xpath("//a[@title='Home']"))).click();

//        driver.findElement(By.xpath("//div[text()='Music']")).click();
//        Thread.sleep(4000);

        driver.findElement(By.xpath("(//a[@id='video-title-link'])[2]")).click();

        wait.until(ExpectedConditions.visibilityOf(driver.findElement(By.xpath("//*[@id='top-level-buttons-computed']/yt-button-view-model/button-view-model/button/yt-touch-feedback-shape/div/div[2]")))).click();

        driver.close();
        // //*[@id="top-level-buttons-computed"]/yt-button-view-model/button-view-model/button/yt-touch-feedback-shape/div/div[2]
    }
}
